"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import confetti from 'canvas-confetti';
import SearchBox from '@/components/shared/SearchBox';
import CitySelectionPopup from '@/features/client/components/CitySelectionPopup';
import Footer from '@/components/layout/Footer';
import AuthPopup from '@/features/onboarding/components/AuthPopup';
import ClientWhatsAppPopup from '@/features/client/components/ClientWhatsAppPopup';
import OrderCard, { OrderDetails } from '@/features/orders/components/OrderCard';
import WeekCalendar from '@/features/calendar/components/WeekCalendar';
import ClientOrdersView from '@/features/orders/components/ClientOrdersView';
import HeroesView from '@/features/client/components/HeroesView';
import ShareAndEarnView from '@/features/client/components/ShareAndEarnView';
import PromocodesView from '@/features/client/components/PromocodesView';
import { DesktopHeroScroll } from '@/components/shared/DesktopHeroScroll';
import { MoroccoServiceMap } from '@/components/shared/MoroccoServiceMap';
import OrderHistoryCarousel from '@/features/orders/components/OrderHistoryCarousel';
import LanguagePreferencePopup from '@/features/onboarding/components/LanguagePreferencePopup';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import MessagesView from '@/features/messages/components/MessagesView';
import ProfileView from '@/features/provider/components/ProfileView';
import ClientHome from '@/features/client/components/ClientHome';
import OnboardingPopup from '@/features/onboarding/components/OnboardingPopup';
import OrderSubmissionFlow, { DraftOrder } from '@/features/orders/components/OrderSubmissionFlow';
import AdminDashboard from '@/features/admin/components/AdminDashboard';
import AdminOrdersView from '@/features/orders/components/AdminOrdersView';
import AdminBricolerCreator from '@/features/admin/components/AdminBricolerCreator';
import AdminBricolersView from '@/features/admin/components/AdminBricolersView';
import SplashScreen from '@/components/layout/SplashScreen';
import RatingPopup from '@/features/orders/components/RatingPopup';
import ClientNotificationsView from '@/features/client/components/ClientNotificationsView';
import AdminNotificationsView from '@/features/admin/components/AdminNotificationsView';
import AdminReceivablesView from '@/features/admin/components/AdminReceivablesView';
import {
  MapPin,
  ChevronDown,
  Shield,
  Search,
  MessageSquare,
  Star,
  ClipboardList,
  CheckCircle2,
  MessageCircle,
  Plus,
  Minus,

  Image as ImageIcon,
  X,
  Trash2,
  Upload,
  Bell,
  User,
  Clock,
  User as UserIcon,
  Send,
  Check,
  RotateCcw,
  Zap,
  Calendar
} from 'lucide-react';
import { getAllServices, getServiceById, getSubServiceName, getServiceName, type ServiceConfig } from '@/config/services_config';
import {
  FaHammer,
  FaScrewdriverWrench,
  FaBroom,
  FaFaucet,
  FaBolt,
  FaPaintRoller,
  FaBoxOpen,
  FaPlug,
  FaTv,
  FaBasketShopping,
  FaLeaf,
  FaBaby,
  FaHandHoldingHeart,
  FaCar,
  FaKey,
  FaMotorcycle,
  FaPlaneArrival,
  FaMapLocationDot,
  FaTruck,
  FaWindowRestore
} from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import MillionsImpactSection from '@/components/shared/MillionsImpactSection';
import { auth, db, storage } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { isImageDataUrl, dataUrlToBlob } from '@/lib/imageCompression';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  Timestamp,
  orderBy,
  limit,
  increment
} from 'firebase/firestore';
import { distributeJob } from '@/lib/distribution';
import { useIsMobileViewport } from '@/lib/mobileOnly';

const SERVICE_CRAFTS: string[] = [
  'Handyman / small repairs',
  'Furniture assembly',
  'Cleaning',
  'Glass Cleaning',
  'Plumbing',
  'Electricity',
  'Painting',
  'Moving help',
  'Appliance installation',
  'Mounting (TV, shelves, curtains)',
  'Errands & small deliveries',
  'Gardening',
  'Babysitting',
  'Elderly assistance',
  'Cooking',
  'Private Driver',
  'Learn Arabic',
  'Tour Guide',
  'Car with driver',
  'Car rental',
  'Courier / delivery',
  'Airport pickup',
  'Intercity transport'
];

const HERO_IMAGES = [
  "/Images/Hero Images/ChatGPT Image Feb 16, 2026, 11_36_11 PM.webp",
  "/Images/Hero Images/ChatGPT Image Feb 16, 2026, 11_30_17 PM.webp",
  "/Images/Hero Images/ChatGPT Image Feb 16, 2026, 11_20_23 PM.webp"
];

const getAgentType = (s: string, count: number, t: (vals: { en: string, fr: string }) => string) => {
  const isPlural = count > 1;
  switch (s) {
    case 'Handyman / small repairs':
      return t({ en: isPlural ? 'Handymen' : 'Handyman', fr: isPlural ? 'Bricoleurs' : 'Bricoleur' });
    case 'Furniture assembly':
      return t({ en: isPlural ? 'Assemblers' : 'Assembler', fr: isPlural ? 'Monteurs' : 'Monteur' });
    case 'Cleaning':
      return t({ en: isPlural ? 'Cleaners' : 'Cleaner', fr: isPlural ? 'Femmes de ménage' : 'Femme de ménage' });
    case 'Glass Cleaning':
      return t({ en: isPlural ? 'Glass Cleaners' : 'Glass Cleaner', fr: isPlural ? 'Nettoyeurs de vitres' : 'Nettoyeur de vitres' });
    case 'Plumbing':
      return t({ en: isPlural ? 'Plumbers' : 'Plumber', fr: isPlural ? 'Plombiers' : 'Plombier' });
    case 'Electricity':
      return t({ en: isPlural ? 'Electricians' : 'Electrician', fr: isPlural ? 'Électriciens' : 'Électricien' });
    case 'Painting':
      return t({ en: isPlural ? 'Painters' : 'Painter', fr: isPlural ? 'Peintres' : 'Peintre' });
    case 'Moving help':
      return t({ en: isPlural ? 'Movers' : 'Mover', fr: isPlural ? 'Déménageurs' : 'Déménageur' });
    case 'Appliance installation':
      return t({ en: isPlural ? 'Installers' : 'Installer', fr: isPlural ? 'Installateurs' : 'Installateur' });
    case 'Mounting (TV, shelves, curtains)':
      return t({ en: isPlural ? 'Installers' : 'Installer', fr: isPlural ? 'Installateurs' : 'Installateur' });
    case 'Errands & small deliveries':
      return t({ en: isPlural ? 'Couriers' : 'Courier', fr: isPlural ? 'Coursiers' : 'Coursier' });
    case 'Gardening':
      return t({ en: isPlural ? 'Gardeners' : 'Gardener', fr: isPlural ? 'Jardiniers' : 'Jardinier' });
    case 'Babysitting':
      return t({ en: isPlural ? 'Babysitters' : 'Babysitter', fr: isPlural ? 'Nounous' : 'Nounou' });
    case 'Elderly assistance':
      return t({ en: isPlural ? 'Assistants' : 'Assistant', fr: isPlural ? 'Assistants' : 'Assistant' });
    case 'Car with driver':
      return t({ en: isPlural ? 'Drivers' : 'Driver', fr: isPlural ? 'Chauffeurs' : 'Chauffeur' });
    case 'Car rental':
      return t({ en: isPlural ? 'Professionals' : 'Professional', fr: isPlural ? 'Professionnels' : 'Professionnel' });
    case 'Courier / delivery':
      return t({ en: isPlural ? 'Couriers' : 'Courier', fr: isPlural ? 'Coursiers' : 'Coursier' });
    case 'Airport pickup':
      return t({ en: isPlural ? 'Drivers' : 'Driver', fr: isPlural ? 'Chauffeurs' : 'Chauffeur' });
    case 'Intercity transport':
      return t({ en: isPlural ? 'Drivers' : 'Driver', fr: isPlural ? 'Chauffeurs' : 'Chauffeur' });
    case 'Cooking':
      return t({ en: isPlural ? 'Chefs' : 'Chef', fr: isPlural ? 'Cuisiniers' : 'Cuisinier' });
    case 'Private Driver':
      return t({ en: isPlural ? 'Private Drivers' : 'Private Driver', fr: isPlural ? 'Chauffeurs Privés' : 'Chauffeur Privé' });
    case 'Learn Arabic':
      return t({ en: isPlural ? 'Tutors' : 'Tutor', fr: isPlural ? 'Professeurs' : 'Professeur' });
    case 'Tour Guide':
      return t({ en: isPlural ? 'Tour Guides' : 'Tour Guide', fr: isPlural ? 'Guides Touristiques' : 'Guide Touristique' });
    default:
      return t({ en: isPlural ? 'Professionals' : 'Professional', fr: isPlural ? 'Professionnels' : 'Professionnel' });
  }
};

const getTranslatedName = (s: string, t: (vals: { en: string, fr: string }) => string) => {
  switch (s) {
    case 'Handyman / small repairs': return t({ en: 'Handyman', fr: 'Bricoleur' });
    case 'Furniture assembly': return t({ en: 'Furniture Helper', fr: 'Aide Montage' });
    case 'Cleaning': return t({ en: 'Cleaning Helper', fr: 'Aide Ménage' });
    case 'Glass Cleaning': return t({ en: 'Glass Cleaning', fr: 'Nettoyage Vitres' });
    case 'Plumbing': return t({ en: 'Plumbing Service', fr: 'Plomberie' });
    case 'Electricity': return t({ en: 'Electrical Help', fr: 'Électricité' });
    case 'Painting': return t({ en: 'Painting Service', fr: 'Peinture' });
    case 'Moving help': return t({ en: 'Moving Helper', fr: 'Aide Déménagement' });
    case 'Appliance installation': return t({ en: 'Installer', fr: 'Installateur' });
    case 'Mounting (TV, shelves, curtains)': return t({ en: 'Mounting Pro', fr: 'Pro du Montage' });
    case 'Errands & small deliveries': return t({ en: 'Errands Helper', fr: 'Coursier' });
    case 'Gardening': return t({ en: 'Gardening Helper', fr: 'Jardinage' });
    case 'Babysitting': return t({ en: 'Babysitter', fr: 'Nounou' });
    case 'Elderly assistance': return t({ en: 'Caregiver', fr: 'Aide Senior' });
    case 'Car with driver': return t({ en: 'Private Driver', fr: 'Chauffeur Privé' });
    case 'Car rental': return t({ en: 'Car Rental', fr: 'Location Voiture' });
    case 'Courier / delivery': return t({ en: 'Courier Pro', fr: 'Coursier Pro' });
    case 'Airport pickup': return t({ en: 'Airport Transfer', fr: 'Transfert Aéroport' });
    case 'Intercity transport': return t({ en: 'Intercity Trip', fr: 'Trajet Interurbain' });
    case 'Cooking': return t({ en: 'Cooking', fr: 'Cuisine' });
    case 'Private Driver': return t({ en: 'Private Driver', fr: 'Chauffeur Privé' });
    case 'Learn Arabic': return t({ en: 'Learn Arabic', fr: 'Apprendre l\'Arabe' });
    case 'Tour Guide': return t({ en: 'Tour Guide', fr: 'Guide Touristique' });
    default: return s;
  }
};

const MASTER_ADMIN_CODE = "2026LB"; // You can change this or move to env

const Home = () => {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const c = {
    bg: theme === 'light' ? '#FFFFFF' : '#000000',
    bgSecondary: theme === 'light' ? '#FAFAFA' : '#0D0D0D',
    text: theme === 'light' ? '#000000' : '#FFFFFF',
    textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
    border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
    card: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
    surface: theme === 'light' ? '#F5F5F5' : '#111111'
  };

  const isMobile = useIsMobileViewport(968);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const cleanCityName = (city: string | null) => city ? city.split(' (')[0] : city;
  const [showCityPopup, setShowCityPopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [showMobileOnboarding, setShowMobileOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<'domestic' | 'go'>('domestic');
  const [mobileNavTab, setMobileNavTab] = useState<'home' | 'search' | 'heroes' | 'calendar' | 'messages' | 'profile' | 'share' | 'promocodes' | 'performance' | 'services'>('home');
  const [calendarKey, setCalendarKey] = useState(0);
  const [activeSearchSection, setActiveSearchSection] = useState<string | null>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);
  const [showOrderFlow, setShowOrderFlow] = useState(false);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableSubServices, setAvailableSubServices] = useState<string[]>([]);
  const [isBricoler, setIsBricoler] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isProgramming, setIsProgramming] = useState(false);
  const [trendingSubServices, setTrendingSubServices] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [shadowProfileData, setShadowProfileData] = useState<any | null>(null);
  const [impersonatedBricoler, setImpersonatedBricoler] = useState<{ id: string; name: string } | null>(null);
  const [showAdminBricolerCreator, setShowAdminBricolerCreator] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showClientOnboarding, setShowClientOnboarding] = useState(false);
  const [jobToRate, setJobToRate] = useState<OrderDetails | null>(null);
  const [showClientNotifications, setShowClientNotifications] = useState(false);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const [showAdminReceivables, setShowAdminReceivables] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);


  const [mounted, setMounted] = useState(false);

  // Form States
  const [service, setService] = useState("");
  const [subService, setSubService] = useState<string | null>(null);
  const [location, setLocation] = useState("Essaouira");
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({});
  const [activeSchedulingDate, setActiveSchedulingDate] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [showFloatingCalendar, setShowFloatingCalendar] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messagesModalJobId, setMessagesModalJobId] = useState<string | null>(null);
  const [dateUnavailableTimes, setDateUnavailableTimes] = useState<Record<string, string[]>>({});
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [newlyProgrammedOrderId, setNewlyProgrammedOrderId] = useState<string | null>(null);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [showHistoryInOrders, setShowHistoryInOrders] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<DraftOrder | null>(null);

  // Handle Splash Dismissal based on data syncing
  useEffect(() => {
    // We wait for initial mount and for the main loading flags to clear
    // We also add a small minimum delay (e.g. 1.5s) to ensure the splash is actually seen if data loads instantly
    const minTimer = setTimeout(() => {
      if (mounted && !loadingOrders && !loadingServices) {
        setShowSplash(false);
      }
    }, 1500);

    if (mounted && !loadingOrders && !loadingServices) {
      // If data is already ready, we still respect the minTimer for branding
      const finalTimer = setTimeout(() => setShowSplash(false), 500);
      return () => {
        clearTimeout(minTimer);
        clearTimeout(finalTimer);
      };
    }

    return () => clearTimeout(minTimer);
  }, [mounted, loadingOrders, loadingServices]);

  // Cycle Hero Images
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Prevent body scroll when calendar is expanded
  useEffect(() => {
    if (isCalendarExpanded && !isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isCalendarExpanded, isMobile]);

  // Optimistic Calendar Show & Orders
  useEffect(() => {
    const hasOrders = localStorage.getItem('lbricol_has_orders') === 'true';
    if (hasOrders) setShowFloatingCalendar(true);

    const savedOrders = localStorage.getItem('lbricol_saved_orders');
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
        setLoadingOrders(false); // Can optimistically set to false if we have data
      } catch (e) {
        console.error("Error parsing saved orders", e);
      }
    }
  }, []);



  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [showClientWhatsAppPopup, setShowClientWhatsAppPopup] = useState(false);
  const [pendingQuickOrder, setPendingQuickOrder] = useState<any>(null);
  const [cityServices, setCityServices] = useState<string[]>([]);
  const [citySubServices, setCitySubServices] = useState<string[]>([]);
  const [popularServiceIds, setPopularServiceIds] = useState<string[]>([]);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const whenSectionRef = useRef<HTMLDivElement>(null);
  const priceSectionRef = useRef<HTMLDivElement>(null);
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  const [showCounterModal, setShowCounterModal] = useState(false);

  const [viewingProviderId, setViewingProviderId] = useState<string | null>(null);
  const [providerDetails, setProviderDetails] = useState<any>(null);
  const [activeCounterOffer, setActiveCounterOffer] = useState<{ jobId: string, bricolerId: string, oldPrice: number } | null>(null);
  const [counterInputPrice, setCounterInputPrice] = useState("");
  const [incomingMessages, setIncomingMessages] = useState<any[]>([]);
  const [dismissedMessages, setDismissedMessages] = useState<string[]>([]);

  // Persist dismissed items
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('lbricol_dismissed_messages', JSON.stringify(dismissedMessages));
    }
  }, [dismissedMessages, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('lbricol_dismissed_offers', JSON.stringify(dismissedOffers));
    }
  }, [dismissedOffers, mounted]);

  // Clear newly programmed highlight after a few seconds
  useEffect(() => {
    if (newlyProgrammedOrderId) {
      const timer = setTimeout(() => {
        setNewlyProgrammedOrderId(null);
      }, 5000); // 5 seconds of highlight
      return () => clearTimeout(timer);
    }
  }, [newlyProgrammedOrderId]);

  // Auto-dismiss messages when job is selected
  useEffect(() => {
    if (selectedOrderId) {
      const messagesToDismiss = incomingMessages
        .filter(m => m.jobId === selectedOrderId)
        .map(m => m.id);
      if (messagesToDismiss.length > 0) {
        setDismissedMessages(prev => {
          const newSet = new Set([...prev, ...messagesToDismiss]);
          return Array.from(newSet);
        });
      }
    }
  }, [selectedOrderId, incomingMessages.length]);

  const [autoChatOrderId, setAutoChatOrderId] = useState<string | null>(null);
  const notifiedMessageIds = useRef<Set<string>>(new Set());
  const notifiedNotificationIds = useRef<Set<string>>(new Set());

  // Fetch provider details when viewingProviderId changes
  useEffect(() => {
    if (viewingProviderId) {
      const fetchProvider = async () => {
        try {
          const docRef = doc(db, 'bricolers', viewingProviderId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProviderDetails(docSnap.data());
          }
        } catch (err) {
          console.error("Error fetching provider details:", err);
        }
      };
      fetchProvider();
    } else {
      setProviderDetails(null);
    }
  }, [viewingProviderId]);

  // Persistence: Load city, language, and dismissed items on mount
  useEffect(() => {
    const savedCity = localStorage.getItem('lbricol_preferred_city');
    const savedLang = localStorage.getItem('lbricol_language');
    const savedDismissedMessages = localStorage.getItem('lbricol_dismissed_messages');
    const savedDismissedOffers = localStorage.getItem('lbricol_dismissed_offers');

    if (savedDismissedMessages) {
      try {
        const parsed = JSON.parse(savedDismissedMessages);
        setDismissedMessages(parsed);
        parsed.forEach((id: string) => notifiedMessageIds.current.add(id));
      } catch (e) {
        console.error("Error parsing dismissed messages:", e);
      }
    }
    if (savedDismissedOffers) {
      try {
        setDismissedOffers(JSON.parse(savedDismissedOffers));
      } catch (e) {
        console.error("Error parsing dismissed offers:", e);
      }
    }

    const savedNotifiedIds = localStorage.getItem('lbricol_notified_notif_ids');
    if (savedNotifiedIds) {
      try {
        const parsed = JSON.parse(savedNotifiedIds);
        parsed.forEach((id: string) => notifiedNotificationIds.current.add(id));
      } catch (e) {
        console.error("Error parsing notified IDs:", e);
      }
    }

    // NEW: Check for Client Onboarding
    const onboardingShown = localStorage.getItem('client_onboarding_shown');
    if (!onboardingShown) {
      setShowClientOnboarding(true);
    }

    if (!savedLang) {
      setShowLanguagePopup(true);
    } else if (!savedCity) {
      setShowCityPopup(true);
    } else {
      // Migrate old city names (e.g. Marrakech vs Marrakesh)
      let migratedCity = savedCity;
      if (migratedCity === 'Marrakesh') migratedCity = 'Marrakech';

      // Remove the artificial '(Inside)' suffix if present from old sessions
      if (migratedCity && migratedCity.includes(' (')) {
        migratedCity = migratedCity.split(' (')[0];
        localStorage.setItem('lbricol_preferred_city', migratedCity);
      }

      setSelectedCity(migratedCity);
      setLocation(migratedCity);

      const savedArea = localStorage.getItem('lbricol_preferred_area');
      if (savedArea) setSelectedArea(savedArea);

      setShowCityPopup(false);
    }

    // RESTORE PENDING ORDER after auth redirect (mobile hack)
    const savedPending = localStorage.getItem('lbricol_pending_quick_order');
    if (savedPending) {
      try {
        setPendingQuickOrder(JSON.parse(savedPending));
      } catch (e) {
        console.error("Error parsing saved pending order:", e);
      }
    }

    setMounted(true);
  }, []);

  // Supply-side Service Filtering
  useEffect(() => {
    if (!selectedCity) return;

    const fetchActiveServices = async () => {
      try {
        setLoadingServices(true);
        const q = query(
          collection(db, 'bricolers'),
          where('city', '==', selectedCity)
        );
        const snap = await getDocs(q);
        const pros = snap.docs
          .map(d => d.data())
          .filter(d => d.isActive === true);

        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const localPros = selectedArea
          ? pros.filter(p => p.workAreas?.some((wa: any) => normalize(wa) === normalize(selectedArea)))
          : pros;

        const activeIds = new Set<string>();
        const activeSubIds = new Set<string>();
        const subFreq: Record<string, number> = {};

        // Populate from pros nearby
        localPros.forEach(p => {
          if (Array.isArray(p.services)) {
            p.services.forEach((s: any) => {
              const id = typeof s === 'string' ? s : (s.categoryId || s.serviceId);
              if (id) activeIds.add(id);

              const subId = typeof s === 'object' ? s.subServiceId : null;
              if (subId) {
                activeSubIds.add(subId);
                subFreq[subId] = (subFreq[subId] || 0) + 1;
              }
            });
          }
        });

        const trendingIds = Object.entries(subFreq)
          .sort((a, b) => b[1] - a[1]) // Sort by count descending
          .slice(0, 6) // Top 6 hottest sub-tasks
          .map(e => e[0]);

        // Merge with city-wide cache from city_services collection
        const finalServices = new Set([...Array.from(activeIds), ...cityServices]);
        const finalSubServices = new Set([...Array.from(activeSubIds), ...citySubServices]);

        setAvailableServices(Array.from(finalServices) as string[]);
        setAvailableSubServices(Array.from(finalSubServices) as string[]);
        setTrendingSubServices(trendingIds);
      } catch (err) {
        console.error("Error fetching active services:", err);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchActiveServices();
  }, [selectedCity, selectedArea, cityServices, citySubServices]);

  // Monthly popularity stats per city & service category
  useEffect(() => {
    if (!selectedCity) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
    const statsDocId = `${selectedCity}_${monthKey}`;
    const statsRef = doc(db, 'city_monthly_stats', statsDocId);
    getDoc(statsRef)
      .then(snap => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, any>;

        // Aggregate counts by canonical service ID so we can sort categories
        const aggregated = new Map<string, number>();

        Object.entries(data)
          .filter(([k]) => k !== 'city' && k !== 'month')
          .forEach(([rawKey, value]) => {
            const count = typeof value === 'number' ? value : 0;
            if (count <= 0) return;

            // rawKey might be a craft label slug; map it to a known service when possible
            const serviceConfig = getServiceById(rawKey);
            const serviceId = (serviceConfig?.id || rawKey).toLowerCase();

            aggregated.set(serviceId, (aggregated.get(serviceId) || 0) + count);
          });

        const sortedIds = Array.from(aggregated.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([serviceId]) => serviceId);

        setPopularServiceIds(sortedIds);
      })
      .catch(() => { });
  }, [selectedCity]);

  // Professional Types Animation
  const [profIndex, setProfIndex] = useState(0);

  const professionalTypesDomestic = [
    { en: "Handyman", fr: "Bricoleur" },
    { en: "Cleaner", fr: "Femme de ménage" },
    { en: "Plumber", fr: "Plombier" },
    { en: "Electrician", fr: "Électricien" },
    { en: "Painter", fr: "Peintre" },
    { en: "Gardener", fr: "Jardinier" },
    { en: "Babysitter", fr: "Nounou" },
  ];

  const professionalTypesGo = [
    { en: "Mover", fr: "Déménageur" },
    { en: "Driver", fr: "Chauffeur" },
    { en: "Courier", fr: "Coursier" },
  ];
  // const [isBricoler, setIsBricoler] = useState(false); // Already declared above

  const handleProfileBricolerAction = () => {
    if (isBricoler) {
      window.location.href = '/provider';
    } else {
      setShowMobileOnboarding(true);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setProfIndex((prev) => prev + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentTypes = activeTab === 'domestic' ? professionalTypesDomestic : professionalTypesGo;
  const currentProf = currentTypes[profIndex % currentTypes.length];

  // Sound Notification for Responses
  const prevOfferCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!orders || orders.length === 0) {
      if (!loadingOrders) prevOfferCountRef.current = 0;
      return;
    }

    const currentOfferCount = orders.reduce((total, job) => {
      const providerOffers = job.offers?.filter(o => o.sender !== 'client') || [];
      return total + providerOffers.length;
    }, 0);

    // Only play sound if the count has increased and it's not the first load
    if (prevOfferCountRef.current !== null && currentOfferCount > prevOfferCountRef.current) {
      // Find the newest offer to determine type
      const allOffers: any[] = [];
      orders.forEach(j => j.offers?.forEach((o: any) => { if (o.sender !== 'client') allOffers.push({ o, j }); }));

      const latestOfferPair = allOffers.sort((a, b) => (b.o.timestamp?.seconds || 0) - (a.o.timestamp?.seconds || 0))[0];

      if (latestOfferPair) {
        const isAcceptance = Number(latestOfferPair.o.price) === Number(latestOfferPair.j.price);
        try {
          // Acceptance chimes vs Counter pop
          const soundUrl = isAcceptance
            ? 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
            : 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
          const audio = new Audio(soundUrl);
          audio.volume = 0.5;
          audio.play().catch(e => console.warn("Audio play blocked:", e));
        } catch (err) {
          console.error("Error playing notification sound:", err);
        }
      }
    }

    if (!loadingOrders) {
      prevOfferCountRef.current = currentOfferCount;
    }
  }, [orders, loadingOrders]);

  // Message Listener for Notifications
  useEffect(() => {
    if (!currentUser || orders.length === 0) return;

    const activeJobIds = orders
      .filter(o => o.id && ['new', 'negotiating', 'confirmed', 'pending'].includes(o.status as any))
      .map(o => o.id as string);

    if (activeJobIds.length === 0) return;

    const unsubs: (() => void)[] = [];

    activeJobIds.forEach(id => {
      if (!id) return;
      const jobId = id as string;
      const messagesRef = collection(db, 'jobs', jobId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(5));

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const msgId = change.doc.id;

            // Only notify if sender is NOT the current user AND we haven't notified for this msgId yet
            if (data.senderId !== currentUser.uid && !notifiedMessageIds.current.has(msgId)) {
              notifiedMessageIds.current.add(msgId);

              const job = orders.find(o => o.id === jobId);
              setIncomingMessages(prev => {
                if (prev.find(m => m.id === msgId)) return prev;
                return [...prev, { ...data, id: msgId, jobId, serviceTitle: job?.service || 'Service' }];
              });

              // Play sound
              try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.warn("Audio play message sound blocked:", e));
              } catch (err) {
                console.error("Error playing message notification sound:", err);
              }
            }
          }
        });
      }, (err) => console.error(`Error listening to messages for ${jobId}:`, err));
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
  }, [orders, currentUser]);

  // Client Notifications Listener (Real-time Toasts & Sounds)
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'client_notifications'),
      where('clientId', '==', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const id = change.doc.id;

          if (!notifiedNotificationIds.current.has(id)) {
            // Only chime/toast if it's very recent (to avoid noise on initial load)
            const createdAtMillis = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
            const isFresh = (Date.now() - createdAtMillis) < 60000; // Within 1 minute

            if (isFresh) {
              notifiedNotificationIds.current.add(id);
              // Save to localStorage to persist across refreshes
              const currentIds = Array.from(notifiedNotificationIds.current);
              localStorage.setItem('lbricol_notified_notif_ids', JSON.stringify(currentIds));

              // Play Sound
              try {
                const soundUrl = data.type === 'order_confirmed'
                  ? 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'
                  : 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

                const audio = new Audio(soundUrl);
                audio.volume = 0.5;
                audio.play().catch(e => console.warn("Audio play blocked by browser:", e));
              } catch (err) {
                console.warn("Error playing notification sound:", err);
              }

              // Show Toast
              showToast({
                title: data.title || 'Notification',
                description: data.body,
                variant: data.type === 'order_confirmed' ? 'success' : 'info',
                duration: 5000
              });
            } else {
              // Even if not fresh, mark as notified so it doesn't toast if it becomes "fresh" later (unlikely but safe)
              notifiedNotificationIds.current.add(id);
              const currentIds = Array.from(notifiedNotificationIds.current);
              localStorage.setItem('lbricol_notified_notif_ids', JSON.stringify(currentIds));
            }
          }
        }
      });
    }, (err) => {
      if (err.code !== 'permission-denied') {
        console.error("Error listening to client notifications:", err);
      }
    });

    return unsub;
  }, [currentUser, showToast]);

  // Listener for unread count
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'client_notifications'),
      where('clientId', '==', currentUser.uid),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnreadNotifsCount(snap.size);
    });
    return unsub;
  }, [currentUser]);

  const handleCodeEntered = async (code: string) => {
    try {
      const q = query(collection(db, 'bricolers'), where('claimCode', '==', code.toUpperCase()), limit(1));
      const s = await getDocs(q);
      if (!s.empty) {
        const data = s.docs[0].data();
        setShadowProfileData({ ...data, id: s.docs[0].id });
        setShowMobileOnboarding(true);
      } else {
        showToast({
          variant: 'error',
          title: t({ en: 'Invalid code', fr: 'Code invalide' }),
          description: t({ en: 'This activation code does not exist.', fr: 'Ce code d\'activation n\'existe pas.' })
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminAction = async (code?: string) => {
    if (isAdmin) {
      if (isAdminMode) {
        setIsAdminMode(false);
        setMobileNavTab('home');
      } else {
        setIsAdminMode(true);
        setMobileNavTab('performance');
      }
      return;
    }

    if (code === MASTER_ADMIN_CODE) {
      if (!currentUser) {
        setShowAuthPopup(true);
        return;
      }

      try {
        const clientRef = doc(db, 'clients', currentUser.uid);
        await setDoc(clientRef, { role: 'admin' }, { merge: true });
        setIsAdmin(true);
        setIsAdminMode(true);
        setMobileNavTab('performance');
        showToast({
          title: t({ en: 'Admin access granted!', fr: 'Accès Admin accordé !' }),
          variant: 'success'
        });
      } catch (err) {
        console.error("Error upgrading to admin:", err);
        showToast({
          title: t({ en: 'Failed to grant admin access', fr: 'Échec de l\'accès Admin' }),
          variant: 'error'
        });
      }
    } else {
      showToast({
        title: t({ en: 'Invalid admin code', fr: 'Code admin invalide' }),
        variant: 'error'
      });
    }
  };

  useEffect(() => {
    // Auth Listener
    let unsubscribeJobs: (() => void) | null = null;
    let unsubscribeUserData: (() => void) | null = null;
    let unsubscribeBricolerStatus: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        // Cleanup previous listeners
        if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
        if (unsubscribeUserData) { unsubscribeUserData(); unsubscribeUserData = null; }
        if (unsubscribeBricolerStatus) { unsubscribeBricolerStatus(); unsubscribeBricolerStatus = null; }

        setCurrentUser(user);
        console.log("🔐 Auth state changed:", user ? `Logged in as ${user.email}` : "Not logged in");

        if (user) {
          // 1. Real-time User Data (Global profile)
          const userRef = doc(db, 'users', user.uid);
          unsubscribeUserData = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserData(data);
              setIsAdmin(data.role === 'admin');
            } else {
              // Initialize global user profile if new
              const newUser = {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                createdAt: serverTimestamp()
              };
              setDoc(userRef, newUser, { merge: true })
                .catch(err => console.error("Error creating global user profile:", err));
            }
          });

          // 2. Real-time Bricoler Status
          const bricolerRef = doc(db, 'bricolers', user.uid);
          unsubscribeBricolerStatus = onSnapshot(bricolerRef, (snap) => {
            setIsBricoler(snap.exists());
          });

          // 3. Real-time Jobs
          const jobsQuery = query(collection(db, 'jobs'), where('clientId', '==', user.uid));
          setLoadingOrders(true);
          unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            const loadedJobs = snapshot.docs.map(doc => ({
              ...doc.data(),
              id: doc.id
            })) as OrderDetails[];
            setOrders(loadedJobs);

            const hasOrders = loadedJobs.length > 0;
            setShowFloatingCalendar(hasOrders);
            localStorage.setItem('lbricol_has_orders', String(hasOrders));
            localStorage.setItem('lbricol_saved_orders', JSON.stringify(loadedJobs));

            setLoadingOrders(false);

            // Handle Recurring Orders Duplicate Logic
            const now = new Date();
            loadedJobs.forEach(async (job) => {
              if (job.status === 'cancelled') return;

              if (job.frequency && job.frequency !== 'once' && job.nextRunDate) {
                const nextDate = new Date(job.nextRunDate);
                if (now >= nextDate) {
                  // Compute the NEXT nextDate for the NEW child job
                  const advanceDate = new Date(nextDate);
                  if (job.frequency === 'daily') advanceDate.setDate(advanceDate.getDate() + 1);
                  else if (job.frequency === 'weekly') advanceDate.setDate(advanceDate.getDate() + 7);
                  else if (job.frequency === 'biweekly') advanceDate.setDate(advanceDate.getDate() + 14);
                  else if (job.frequency === 'monthly') advanceDate.setMonth(advanceDate.getMonth() + 1);

                  try {
                    // Turn off recurrence on OLD job
                    await updateDoc(doc(db, 'jobs', job.id as string), {
                      frequency: 'once',
                      nextRunDate: null
                    });

                    // Spawn the NEW master job
                    const newJobData = {
                      ...job,
                      status: 'new',
                      date: nextDate.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' }),
                      createdAt: serverTimestamp(),
                      offers: [],
                      bricolerId: null,
                      bricolerName: null,
                      bricolerAvatar: null,
                      bricolerRating: null,
                      bricolerRank: null,
                      bricolerJobsCount: null,
                      offeredTo: [],
                      rated: false,
                      feedback: null,
                      comment: null,
                      frequency: job.frequency,
                      nextRunDate: advanceDate.toISOString()
                    };
                    delete newJobData.id;

                    await addDoc(collection(db, 'jobs'), newJobData);
                    console.log(`Spawned new recurring job, transferred master status.`);
                  } catch (e) {
                    console.error('Failed to spawn recurring job:', e);
                  }
                }
              }
            });

            // Detect newly completed jobs to show rating popup
            const unratedDoneJob = loadedJobs.find(j => (j.status === 'done' || j.status === 'delivered') && !j.rated);
            if (unratedDoneJob) {
              setJobToRate(unratedDoneJob);
            }
          }, (err) => {
            if (err.code === 'permission-denied') {
              console.warn("⚠️ Firestore Permission Denied - Possible causes:");
              console.warn("  1. Rules not published yet (wait 1-2 min after publishing)");
              console.warn("  2. User not authenticated (check auth state above)");
              console.warn("  3. Rules syntax error in Firebase Console");
              console.warn("Full error:", err);
            } else {
              console.error("Error fetching jobs real-time:", err);
            }
            setLoadingOrders(false);
          });
        } else {
          setUserData(null);
          setIsBricoler(false);
          setOrders([]); // Clear orders if logged out
          setLoadingOrders(false);
        }
      },
      (error: any) => {
        console.error("Error fetching client data:", error);
      }
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeJobs) unsubscribeJobs();
    };
  }, []); // Reverted to mount-only

  // Separate Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target as Node)) {
        setActiveSearchSection(null);
        // We do NOT hide showExtraDetails on click outside anymore, so it persists
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeSearchSection !== 'what') {
      setShowAllServices(false);
    }
  }, [activeSearchSection, isMobile]);

  // --- Automatic Order Status Updates ---
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const checkStatusTransitions = async () => {
      const now = new Date();

      for (const order of orders) {
        if (!auth.currentUser || !order.id || !order.date) continue;

        // Skip terminal statuses
        if (['cancelled', 'done', 'delivered'].includes(order.status || '')) continue;

        try {
          // Parse start time
          const datePart = order.date.includes(' at ') ? order.date.split(' at ')[0] : order.date;
          const timeStr = order.time?.split('-')[0].trim() || "09:00";

          // Try parsing "March 10, 2026" or "2026-03-10"
          const scheduledStart = new Date(datePart);
          const [hours, mins] = timeStr.split(':').map(Number);
          if (!isNaN(hours)) scheduledStart.setHours(hours, mins || 0, 0, 0);

          if (isNaN(scheduledStart.getTime())) continue;

          // Calculate estimated duration
          // Task size: small (1h), medium (2h), large (varies)
          let durationHours = 2; // Default for medium/others
          const size = (order.taskSize || 'medium').toLowerCase();
          const service = (order.service || '').toLowerCase();

          if (size === 'small') {
            durationHours = 1;
          } else if (size === 'medium') {
            durationHours = 2;
          } else if (size === 'large') {
            // "Large" varies by service
            if (service.includes('painting')) durationHours = 8;
            else if (service.includes('moving')) durationHours = 6;
            else if (service.includes('cleaning')) durationHours = 5;
            else if (service.includes('gardening')) durationHours = 5;
            else if (service.includes('electricity') || service.includes('plumbing')) durationHours = 5;
            else durationHours = 4; // Default large
          }

          const scheduledEnd = new Date(scheduledStart.getTime() + durationHours * 60 * 60 * 1000);

          let newStatus: string | null = null;

          if (now >= scheduledEnd) {
            newStatus = 'done';
          } else if (now >= scheduledStart) {
            // Only transition to pending if it's currently programmed/accepted/new/negotiating
            if (['programmed', 'confirmed', 'accepted', 'new', 'negotiating'].includes(order.status || '')) {
              newStatus = 'pending';
            }
          }

          if (newStatus && newStatus !== order.status) {
            console.log(`[AutoUpdate] Transitioning order ${order.id} from ${order.status} to ${newStatus}`);
            await updateDoc(doc(db, 'jobs', order.id), { status: newStatus as any });

            // If it became 'done', the rating popup will show up automatically 
            // because of the listener in the main useEffect.
          }
        } catch (e) {
          console.error("Error in auto status update for order", order.id, e);
        }
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkStatusTransitions, 120000);
    checkStatusTransitions();

    return () => clearInterval(interval);
  }, [orders]);


  // Global Keyboard-Aware Scroll Handling
  useEffect(() => {
    if (!window.visualViewport) return;

    const onViewportChange = () => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    window.visualViewport.addEventListener('resize', onViewportChange);
    window.visualViewport.addEventListener('scroll', onViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
    };
  }, []);

  const handleInputFocus = (e: React.FocusEvent<any>) => {
    if (!isMobile) return;
    const el = e.target;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const [calendarMode, setCalendarMode] = useState<'multi' | 'range'>('multi');
  const [rangeSelection, setRangeSelection] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  // Supply-driven: Fetch active services for city
  useEffect(() => {
    if (selectedCity) {
      const fetchCityServices = async () => {
        setLoadingServices(true);
        try {
          const cityRef = doc(db, 'city_services', selectedCity);
          const citySnap = await getDoc(cityRef);

          if (citySnap.exists()) {
            const data = citySnap.data();
            setCityServices(data.active_services || []);
            setCitySubServices(data.active_sub_services || []);
          } else {
            // FALLBACK: Try without the area suffix if suffixed Doc not found
            const cleanName = selectedCity.split(' (')[0];
            if (cleanName !== selectedCity) {
              const fallbackRef = doc(db, 'city_services', cleanName);
              const fallbackSnap = await getDoc(fallbackRef);
              if (fallbackSnap.exists()) {
                const data = fallbackSnap.data();
                setCityServices(data.active_services || []);
                setCitySubServices(data.active_sub_services || []);
                return;
              }
            }
            setCityServices([]);
            setCitySubServices([]);
          }
        } catch (err) {
          console.error("Error fetching city services:", err);
        } finally {
          setLoadingServices(false);
        }
      };
      fetchCityServices();
    }
  }, [selectedCity]);

  // Extra Details State
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [bricolersCount, setBricolersCount] = useState(1);
  const [orderComment, setOrderComment] = useState("");
  const [orderPictures, setOrderPictures] = useState<string[]>([]);

  // Icon imports check (already has MapPin, ChevronDown, search, clock, dollar from searchbox)
  // Need Plus, Minus, Image, MessageSquare? Let's check imports.
  // Calendar Helpers
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });
  const year = calendarDate.getFullYear();
  const daysInMonth = new Date(year, calendarDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(year, calendarDate.getMonth(), 1).getDay();

  const nextMonth = () => setCalendarDate(new Date(year, calendarDate.getMonth() + 1, 1));
  const prevMonth = () => setCalendarDate(new Date(year, calendarDate.getMonth() - 1, 1));

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(year, calendarDate.getMonth(), day);
    const dateString = `${monthName} ${day}, ${year}`;

    if (unavailableDates.includes(dateString)) {
      return;
    }

    if (calendarMode === 'multi') {
      setSelectedDates(prev => {
        const isSelected = prev.includes(dateString);
        if (!isSelected) setActiveSchedulingDate(dateString);
        return isSelected ? prev.filter(d => d !== dateString) : [...prev, dateString];
      });
    } else {
      // Range Logic
      if (!rangeSelection.start || (rangeSelection.start && rangeSelection.end)) {
        // Start new range
        setRangeSelection({ start: selectedDate, end: null });
        setSelectedDates([dateString]);
        setActiveSchedulingDate(dateString);
      } else {
        // Complete range
        let newStart = rangeSelection.start;
        let newEnd = selectedDate;

        if (newEnd < newStart) {
          [newStart, newEnd] = [newEnd, newStart];
        }

        setRangeSelection({ start: newStart, end: newEnd });
        setActiveSchedulingDate(dateString);

        // Generate formats for visual feedback? Or just store range string
        // actually we just need to know the range.
        // selectedDates can just hold the string representation for the UI to use if needed,
        // but rely on rangeSelection for logic.
        const startStr = `${newStart.toLocaleString('default', { month: 'long' })} ${newStart.getDate()}, ${newStart.getFullYear()}`;
        const endStr = `${newEnd.toLocaleString('default', { month: 'long' })} ${newEnd.getDate()}, ${newEnd.getFullYear()}`;
        setSelectedDates([`${startStr} - ${endStr}`]);
      }
    }
  };

  const handleCitySelect = (city: string, area: string) => {
    setSelectedCity(city);
    setSelectedArea(area);
    setLocation(city);
    localStorage.setItem('lbricol_preferred_city', city);
    localStorage.setItem('lbricol_preferred_area', area);
    setShowCityPopup(false);
    setActiveSearchSection('what');
  };

  const handleLanguageSelect = (lang: 'en' | 'fr' | 'ar') => {
    setLanguage(lang);
    setShowLanguagePopup(false);
    if (!selectedCity) {
      setShowCityPopup(true);
    } else {
      setActiveSearchSection('what');
    }
  };

  // Availability Check Logic
  useEffect(() => {
    if (!service || !selectedCity) {
      setUnavailableDates([]);
      setDateUnavailableTimes({});
      return;
    }

    const checkAvailability = async () => {
      try {
        // 1. Get all providers in city who offer this service
        const providersQuery = query(
          collection(db, 'bricolers'),
          where('city', '==', selectedCity)
        );
        const providersSnap = await getDocs(providersQuery);
        const eligibleProviders = providersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(data => {
          if (!data.services || !Array.isArray(data.services)) return false;

          return data.services.some((s: any) => {
            // Handle both formats: categoryId (new), serviceId (old-new), or fallback to strings
            const currentCatId = typeof s === 'string' ? s : (s.categoryId || s.serviceId);
            if (!currentCatId || typeof currentCatId !== 'string') return false;

            const catMatch = currentCatId.toLowerCase() === service.toLowerCase();
            if (!catMatch) return false;

            if (subService) {
              // Check if subService matches. For strings, we assume true. 
              // For objects, check subServiceId (new) or subServices array (old-new).
              if (typeof s === 'string') return true;

              const currentSubId = s.subServiceId || (s.subServices?.includes(subService) ? subService : null);
              if (!currentSubId) return false;

              return currentSubId.toLowerCase() === subService.toLowerCase() || (Array.isArray(s.subServices) && s.subServices.includes(subService));
            }

            return true;
          });
        });

        if (eligibleProviders.length === 0) {
          // If no providers at all, all dates are busy
          // We don't want to show everything as red yet, maybe a toast elsewhere
          setUnavailableDates([]);
          return;
        }

        // 2. Identify "Closed Dates" (Capacity-based)
        // Check for all dates in a reasonable window (e.g., current month +/- 15 days)
        const dateRangeQuery = query(
          collection(db, 'jobs'),
          where('city', '==', selectedCity)
        );
        const jobsSnap = await getDocs(dateRangeQuery);
        const validStatuses = ['new', 'negotiating', 'pending', 'waiting', 'accepted', 'confirmed', 'in_progress'];
        const list = jobsSnap.docs
          .map(d => d.data())
          .filter(d => validStatuses.includes(d.status));

        // Group jobs by date then by providerId
        const usage: Record<string, Record<string, number>> = {};
        list.forEach(jd => {
          if (!jd.date) return;
          const occupiedIds = jd.bricolerId ? [jd.bricolerId] : (jd.offeredTo || []);
          if (!usage[jd.date]) usage[jd.date] = {};
          occupiedIds.forEach((id: string) => {
            usage[jd.date][id] = (usage[jd.date][id] || 0) + 1;
          });
        });

        const newUnavailableDates: string[] = [];
        // A date is CLOSED if for EVERY eligible provider, that provider is at capacity (2 jobs)
        Object.entries(usage).forEach(([d_str, providerMap]) => {
          const allBusy = eligibleProviders.every(p => (providerMap[p.id] || 0) >= 2);
          if (allBusy) newUnavailableDates.push(d_str);
        });
        setUnavailableDates(newUnavailableDates);

        // 3. Identify "Unavailable Times" (COILLISION-based per DATE)
        const selectedDatesToCheck = calendarMode === 'range' && rangeSelection.start && rangeSelection.end
          ? (() => {
            const dates: string[] = [];
            const curr = new Date(rangeSelection.start);
            while (curr <= rangeSelection.end) {
              const str = `${curr.toLocaleString('default', { month: 'long' })} ${curr.getDate()}, ${curr.getFullYear()}`;
              dates.push(str);
              curr.setDate(curr.getDate() + 1);
            }
            return dates;
          })()
          : selectedDates;

        const timeSlots = ["09:00", "11:30", "14:00", "16:30", "19:00"];
        const newDateUnavailable: Record<string, string[]> = {};

        for (const d_val of selectedDatesToCheck) {
          const unavailableAtDay: string[] = [];
          for (const t_val of timeSlots) {
            // Get jobs at this exact date + time
            const collisions = jobsSnap.docs.filter(doc => {
              const jd = doc.data();
              return jd.date === d_val && jd.time === t_val;
            });
            const collisionProviderIds = new Set<string>();
            collisions.forEach(doc => {
              const jd = doc.data();
              const occupiedIds = jd.bricolerId ? [jd.bricolerId] : (jd.offeredTo || []);
              occupiedIds.forEach((id: string) => collisionProviderIds.add(id));
            });

            // Check if ANY eligible provider is free
            const availableCount = eligibleProviders.filter(p =>
              !collisionProviderIds.has(p.id) && (usage[d_val]?.[p.id] || 0) < 2
            ).length;

            if (availableCount === 0) {
              unavailableAtDay.push(t_val);
            }
          }
          newDateUnavailable[d_val] = unavailableAtDay;
        }

        setDateUnavailableTimes(newDateUnavailable);

        // Sanity Check: Remove selectedTimes if they are no longer available
        setSelectedTimes(prev => {
          const next = { ...prev };
          let changed = false;
          Object.keys(next).forEach(d => {
            if (!selectedDatesToCheck.includes(d)) {
              delete next[d];
              changed = true;
            } else if (newDateUnavailable[d]?.includes(next[d])) {
              delete next[d];
              changed = true;
            }
          });
          return changed ? next : prev;
        });

      } catch (err) {
        console.error("Availability check failed:", err);
      }
    };

    checkAvailability();
  }, [service, subService, selectedCity, selectedDates, rangeSelection, calendarMode, calendarDate]);

  const handleScrollToSearch = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    setActiveSearchSection('what');
    // Ensure it stays at the top if something else shifts it
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 quality for good balance
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const originalBase64 = reader.result as string;
          const compressedBase64 = await compressImage(originalBase64);
          setOrderPictures(prev => [...prev, compressedBase64]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePicture = (index: number) => {
    setOrderPictures(prev => prev.filter((_, i) => i !== index));
  };



  const isProgramDisabled = !service ||
    !price ||
    (selectedDates.length === 0 && (!rangeSelection.start || !rangeSelection.end));

  const handleProgramOrder = async (userOverride?: FirebaseUser, whatsappOverride?: string) => {
    console.log("[handleProgramOrder] Starting");
    setIsProgramming(true);

    const effectiveUser = userOverride || currentUser;

    // We need to resolve the whatsapp number.
    // If we have an override, use it.
    // If not, check userData.
    // NOTE: userData might also be stale, so if we have an effectiveUser, we might want to trust the override or wait.
    let effectiveWhatsApp = whatsappOverride || userData?.whatsappNumber;

    try {
      // Step 1: Validate inputs
      if (!service) {
        showToast({ variant: 'error', title: t({ en: "Please select a service first.", fr: "Veuillez d'abord sélectionner un service." }) });
        setActiveSearchSection('what');
        setIsProgramming(false);
        return;
      }

      const datesToProcess = calendarMode === 'range' && rangeSelection.start && rangeSelection.end
        ? (() => {
          const dates: string[] = [];
          const curr = new Date(rangeSelection.start);
          while (curr <= rangeSelection.end) {
            const str = `${curr.toLocaleString('default', { month: 'long' })} ${curr.getDate()}, ${curr.getFullYear()}`;
            dates.push(str);
            curr.setDate(curr.getDate() + 1);
          }
          return dates;
        })()
        : selectedDates;

      if (datesToProcess.length === 0) {
        showToast({ variant: 'error', title: t({ en: "Please select dates.", fr: "Veuillez sélectionner des dates." }) });
        setActiveSearchSection('when');
        setIsProgramming(false);
        return;
      }

      // Ensure every date has a time
      const missingTimeDate = datesToProcess.find(d => !selectedTimes[d]);
      if (missingTimeDate) {
        showToast({ variant: 'error', title: t({ en: `Please select a time for ${missingTimeDate}.`, fr: `Veuillez sélectionner une heure pour ${missingTimeDate}.` }) });
        setActiveSearchSection('when');
        setIsProgramming(false);
        return;
      }

      // Ensure all selected times are still valid
      const staleDate = datesToProcess.find(d => dateUnavailableTimes[d]?.includes(selectedTimes[d]));
      if (staleDate) {
        showToast({ variant: 'error', title: t({ en: `The time for ${staleDate} is no longer available.`, fr: `L'hour pour ${staleDate} n'est plus disponible.` }) });
        setActiveSearchSection('when');
        setIsProgramming(false);
        return;
      }

      if (!price) {
        showToast({ variant: 'error', title: t({ en: "Please suggest a fair price.", fr: "Veuillez proposer un prix juste." }) });
        setShowExtraDetails(true);
        setActiveSearchSection(null);
        setIsProgramming(false);
        return;
      }

      // Step 2: Check authentication
      if (!effectiveUser) {
        console.log("[handleProgramOrder] No user, showing auth");
        setShowAuthPopup(true);
        setIsProgramming(false);
        return;
      }

      // Step 3: Check WhatsApp
      // If we don't have it in state OR override
      if (!effectiveWhatsApp) {
        // Double check firestore just in case state is stale but auth is real? 
        // No, that's too slow. trust the flow.
        // But maybe userData is null because it hasn't loaded yet?
        // If effectiveUser is present but userData is null, we might be in a race.
        // However, let's assume if we are here, we should have it.

        console.log("[handleProgramOrder] No WhatsApp");
        setShowClientWhatsAppPopup(true);
        setIsProgramming(false);
        return;
      }

      // Step 4: Build orders
      let newOrders: OrderDetails[] = [];

      let finalPrice = parseFloat(price) || 0;
      try {
        const userRef = doc(db, 'users', effectiveUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().referralDiscountAvailable) {
          const disc = userSnap.data().referralDiscountAvailable;
          // In handleProgramOrder, we always apply the discount if available
          finalPrice = Math.max(0, finalPrice - disc);
          await updateDoc(userRef, { referralDiscountAvailable: 0 });

          const referrerId = userSnap.data().referredBy;
          if (referrerId) {
            const referrerRef = doc(db, 'users', referrerId);
            const referrerSnap = await getDoc(referrerRef);
            if (referrerSnap.exists()) {
              const rData = referrerSnap.data();
              if (rData.isProvider) {
                await updateDoc(referrerRef, { bricolerReferralBalance: increment(20) });
              } else {
                await updateDoc(referrerRef, { referralBalance: increment(20) });
              }
            }
          }
          // Mark as issued so delivery logic doesn't double-award
          await updateDoc(userRef, { referralRewardIssued: true });

          showToast({
            variant: 'success',
            title: t({ en: "Referral applied!", fr: "Parrainage appliqué !" }),
            description: t({ en: "20 MAD discount applied to your order.", fr: "Réduction de 20 MAD appliquée à votre commande." })
          });
        }
      } catch (e) {
        console.warn("Could not check referral discount in program order:", e);
      }

      newOrders = datesToProcess.map(d => ({
        service: getTranslatedName(service, t),
        subServiceDisplayName: subService ? getSubServiceName(service, subService) : undefined,
        location: selectedCity as any,
        date: d,
        time: selectedTimes[d],
        price: finalPrice.toString(),
        status: 'new',
        bricolersCount,
        comment: orderComment,
        images: orderPictures,
        craft: SERVICE_CRAFTS.find(key => key === service || service.includes(key)) || 'general'
      }));

      // Step 5: Save to Firestore
      console.log("[handleProgramOrder] Saving to 'jobs' collection...", newOrders.length, "orders");

      const savedOrders: OrderDetails[] = [];

      for (const order of newOrders) {
        // NEW: Distribution Algorithm
        const distribution = await distributeJob({
          service: service as string,
          subService: subService || null,
          city: selectedCity as string,
          date: order.date,
          time: order.time as string,
          clientId: effectiveUser.uid
        });

        const jobData = {
          clientId: effectiveUser.uid,
          clientName: effectiveUser.displayName || "Anonymous",
          clientAvatar: effectiveUser.photoURL || "",
          service: service as string,
          subService: subService || null, // NEW: Include sub-service ID
          subServiceDisplayName: order.subServiceDisplayName || null, // NEW: Include translated sub-service
          date: order.date,
          time: order.time,
          status: 'new',
          offers: [],
          offeredTo: distribution.providerIds, // NEW: Tag with selected providers
          city: selectedCity,
          createdAt: serverTimestamp(),
          title: order.service, // Mapping for Provider view
          description: order.comment || "No detailed description provided.",
          rating: 5, // Default for new users? Or fetch from user profile
          clientWhatsApp: effectiveWhatsApp,
          bricolersCount,
          comment: orderComment,
          images: orderPictures,
          craft: SERVICE_CRAFTS.find(key => key === service || service.includes(key)) || 'general',
          price: finalPrice || 0,
          basePrice: finalPrice ? (finalPrice / 1.15) : 0,
          serviceFee: finalPrice ? (finalPrice - (finalPrice / 1.15)) : 0,
          totalPrice: finalPrice || 0,

        };

        if (jobData.images && jobData.images.length > 0) {
          const uploadPromises = jobData.images.map(async (img: string, idx: number) => {
            if (isImageDataUrl(img)) {
              try {
                const blob = await dataUrlToBlob(img);
                const path = `orders/${effectiveUser.uid}/${Date.now()}_${idx}.jpg`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
                return await getDownloadURL(storageRef);
              } catch (err) {
                console.error("Failed to upload pending data URL image", err);
                return null; // Ignore failed uploads
              }
            }
            return img;
          });
          const resolvedUrls = await Promise.all(uploadPromises);
          jobData.images = resolvedUrls.filter(Boolean) as string[];
        }

        const docRef = await addDoc(collection(db, 'jobs'), jobData);
        console.log("Job saved with ID: ", docRef.id);

        // GUARANTEE CLIENT STATUS
        await setDoc(doc(db, 'clients', effectiveUser.uid), {
          uid: effectiveUser.uid,
          name: effectiveUser.displayName,
          email: effectiveUser.email,
          whatsappNumber: effectiveWhatsApp,
          createdAt: serverTimestamp()
        }, { merge: true });

        savedOrders.push({ ...order, id: docRef.id });

        // Activity Log
        await addDoc(collection(db, 'activity'), {
          type: 'new_order',
          clientId: effectiveUser.uid,
          service,
          city: selectedCity,
          jobId: docRef.id,
          timestamp: serverTimestamp()
        });

        // Monthly popularity tracking per city & service category
        try {
          const now = new Date();
          const monthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
          const statsDocId = `${selectedCity}_${monthKey}`;
          const statsRef = doc(db, 'city_monthly_stats', statsDocId);

          // Prefer canonical service ID for aggregation; fall back to craft label
          const svc = getServiceById(service || jobData.craft || 'general');
          const rawKey = svc?.id || service || jobData.craft || 'general';
          const serviceKey = rawKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');

          await setDoc(
            statsRef,
            {
              city: selectedCity,
              month: monthKey,
              [serviceKey]: increment(1),
            },
            { merge: true },
          );
        } catch (e) {
          // Non-blocking: failure to update stats should not break order programming
        }
      }

      // Step 6: Success logging (Orders state is updated by onSnapshot listener)
      console.log("[handleProgramOrder] Success:", savedOrders.length);

      // --- Congrats Animation ---
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#000000', '#FFD700', '#FFFFFF']
      });

      // Step 7: Reset and notify
      showToast({
        variant: 'success',
        title: t({
          en: "Your order has been programmed successfully!",
          fr: "Votre commande a été programmée !"
        }),
        description: t({
          en: "Providers will see it instantly.",
          fr: "Les prestataires la verront instantanément."
        })
      });

      setSelectedDates([]);
      setRangeSelection({ start: null, end: null });
      setService("");
      setSubService(null);
      setPrice("");
      setOrderComment("");
      setOrderPictures([]);
      setBricolersCount(1);
      setShowExtraDetails(false);
      setActiveSearchSection(null);

      // Scroll to dashboard
      // setTimeout(() => {
      //   document.getElementById('orders-dashboard')?.scrollIntoView({ behavior: 'smooth' });
      // }, 500);

      // Show and expand floating calendar (Desktop) or transition to Calendar Tab (Mobile)
      if (isMobile) {
        setMobileNavTab('calendar');
        // We'll set the selected ID below in the timeout to ensure component is mounted
      } else {
        setShowFloatingCalendar(true);
        setIsCalendarExpanded(true);
      }

      // Auto-open the first new order and highlight it
      if (savedOrders.length > 0) {
        setTimeout(() => {
          setSelectedOrderId(savedOrders[0].id || null);
          setNewlyProgrammedOrderId(savedOrders[0].id || null);
        }, 400); // Wait for modal animation to start/mount
      }

    } catch (error: any) {
      console.error("[handleProgramOrder] FATAL ERROR:", error);
      showToast({
        variant: 'error',
        title: t({
          en: "Error saving order.",
          fr: "Erreur lors de l'enregistrement."
        }),
        description: t({
          en: `${error.message}. Please try again.`,
          fr: `${error.message}. Veuillez réessayer.`
        })
      });
    } finally {
      setIsProgramming(false);
    }
  };


  const handleWhatsAppSuccess = async (whatsappNumber: string, referralCode?: string) => {
    console.log("[handleWhatsAppSuccess] Saving WhatsApp number", referralCode ? "with referral" : "");
    setShowClientWhatsAppPopup(false); // Always close the popup

    if (!currentUser) {
      console.error("[handleWhatsAppSuccess] No current user, cannot save WhatsApp.");
      showToast({
        variant: 'error',
        title: t({ en: "Failed to save WhatsApp number.", fr: "Échec de l’enregistrement du numéro WhatsApp." }),
        description: t({ en: "Please try again.", fr: "Veuillez réessayer." })
      });
      return;
    }

    try {
      // 1. Save WhatsApp to clients
      await setDoc(doc(db, 'clients', currentUser.uid), { whatsappNumber }, { merge: true });
      setUserData((prev: any) => ({ ...prev, whatsappNumber }));

      let referralDiscountApplied = 0;

      // 2. Handle Referral Code if provided
      if (referralCode && referralCode.trim()) {
        const upperCode = referralCode.trim().toUpperCase();
        try {
          const currentUserRef = doc(db, 'users', currentUser.uid);
          const currentUserSnap = await getDoc(currentUserRef);
          const userData = currentUserSnap.data() || {};

          // Basic checks: not used before, not own code
          if (!userData.referredBy && userData.referralCode !== upperCode) {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('referralCode', '==', upperCode));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const referrerId = querySnapshot.docs[0].id;
              await setDoc(currentUserRef, {
                referredBy: referrerId,
                referralDiscountAvailable: 50
              }, { merge: true });

              referralDiscountApplied = 20;
              showToast({
                variant: 'success',
                title: t({ en: "Referral applied!", fr: "Parrainage appliqué !" }),
                description: t({ en: "50 MAD discount applied to your order.", fr: "Réduction de 50 MAD appliquée à votre commande." })
              });
            } else {
              showToast({
                variant: 'error',
                title: t({ en: "Invalid code", fr: "Code invalide" }),
                description: t({ en: "The referral code you entered is invalid.", fr: "Le code de parrainage que vous avez saisi est invalide." })
              });
            }
          }
        } catch (err) {
          console.error("Referral validation error:", err);
        }
      }

      if (pendingQuickOrder) {
        const data = { ...pendingQuickOrder };
        setPendingQuickOrder(null);
        await handleQuickOrderSubmit(data, whatsappNumber, currentUser || undefined);
        return;
      }

      // Retry order programming IMMEDIATELY with the new number
      handleProgramOrder(currentUser || undefined, whatsappNumber);
    } catch (error) {
      console.error("[handleWhatsAppSuccess] Error:", error);
      showToast({
        variant: 'error',
        title: t({ en: "Failed to save WhatsApp number.", fr: "Échec de l’enregistrement du numéro WhatsApp." }),
        description: t({ en: "Please try again.", fr: "Veuillez réessayer." })
      });
    }
  };


  const handleUpdateOrder = async (idx: number, updates: Partial<OrderDetails>) => {
    const order = orders[idx];
    if (order && order.id) {
      try {
        await updateDoc(doc(db, 'jobs', order.id), updates);
      } catch (err) {
        console.error("Error updating order:", err);
      }
    }
  };

  const handleCancelOrder = async (idx: number) => {
    const order = orders[idx];
    if (order && order.id) {
      try {
        await updateDoc(doc(db, 'jobs', order.id), { status: 'cancelled' });
        // Clear selection to close card and close calendar
        setSelectedOrderId(null);
        setIsCalendarExpanded(false);
      } catch (err) {
        console.error("Error cancelling order:", err);
      }
    }
  };

  const handleAcceptOffer = async (jobId: string, offer: any, jobTitle: string) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);
      // Sanitize offer object to remove undefined values for Firestore
      const sanitizedOffer = JSON.parse(JSON.stringify(offer));

      await updateDoc(jobRef, {
        status: 'confirmed',
        bricolerId: offer.bricolerId,
        bricolerName: offer.bricolerName,
        bricolerAvatar: offer.avatar || null,
        finalPrice: offer.price,
        acceptedOffer: sanitizedOffer
      });

      // NEW: Update Client History for Familiarity Scoring
      if (currentUser) {
        const clientRef = doc(db, 'clients', currentUser.uid);
        await updateDoc(clientRef, {
          previousProviders: arrayUnion(offer.bricolerId)
        });

        // NEW: Notify Bricoler of Acceptance
        await addDoc(collection(db, 'bricoler_notifications'), {
          bricolerId: offer.bricolerId,
          type: 'offer_accepted',
          jobId,
          serviceName: jobTitle || 'Service',
          timestamp: serverTimestamp(),
          read: false
        });
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Navigate
      setSelectedOrderId(jobId);
      setAutoChatOrderId(jobId);
      if (isMobile) {
        setMobileNavTab('calendar');
        // The WeekCalendar will pick up setSelectedOrderId via externalSelectedOrderId prop
      } else {
        setIsCalendarExpanded(true);
      }
    } catch (err) {
      console.error("Error GS accepting offer:", err);
    }
  };

  const handleDeclineOffer = async (jobId: string, offer: any, jobTitle: string) => {
    try {
      const jobRef = doc(db, 'jobs', jobId);

      // Update job: add to declinedBricolers so they don't see it anymore
      // Also remove them from offeredTo if present
      await updateDoc(jobRef, {
        offeredTo: arrayRemove(offer.bricolerId),
        declinedBricolers: arrayUnion(offer.bricolerId)
      });

      // Notify Bricoler
      await addDoc(collection(db, 'bricoler_notifications'), {
        bricolerId: offer.bricolerId,
        type: 'offer_declined',
        jobId,
        serviceName: jobTitle || 'Service',
        timestamp: serverTimestamp(),
        read: false
      });

      // Local dismissal
      const offerId = `${jobId}_${offer.bricolerId}_${offer.timestamp?.seconds}`;
      setDismissedOffers(prev => [...prev, offerId]);
    } catch (err) {
      console.error("Error declining offer:", err);
    }
  };

  const handleSendClientCounter = async () => {
    if (!activeCounterOffer || !counterInputPrice) return;
    try {
      const jobRef = doc(db, 'jobs', activeCounterOffer.jobId);
      const newOffer = {
        bricolerId: activeCounterOffer.bricolerId, // Keep reference to provider
        type: 'counter',
        price: parseFloat(counterInputPrice) || 0,
        sender: 'client',
        timestamp: Timestamp.now(),
        comment: t({ en: "Client's counter offer", fr: "Contre-offre du client" })
      };
      await updateDoc(jobRef, {
        offers: arrayUnion(newOffer),
        status: 'negotiating'
      });

      // Notify Bricoler of Counter Offer
      await addDoc(collection(db, 'bricoler_notifications'), {
        bricolerId: activeCounterOffer.bricolerId,
        type: 'counter_offer_received',
        jobId: activeCounterOffer.jobId,
        price: parseFloat(counterInputPrice),
        timestamp: serverTimestamp(),
        read: false
      });

      setShowCounterModal(false);
      setActiveCounterOffer(null);
      setCounterInputPrice("");
    } catch (err) {
      console.error("Error GS sending counter:", err);
    }
  };

  const handleQuickOrderSubmit = async (data: any, whatsappOverride?: string, userOverride?: FirebaseUser) => {
    console.log("[handleQuickOrderSubmit] Starting flow submission", data);
    const effectiveUser = userOverride || currentUser;
    if (!effectiveUser) {
      setPendingQuickOrder(data);
      localStorage.setItem('lbricol_pending_quick_order', JSON.stringify(data));
      setShowAuthPopup(true);
      return;
    }

    const effectiveWhatsApp = whatsappOverride || userData?.whatsappNumber || "";
    if (!effectiveWhatsApp) {
      setPendingQuickOrder(data);
      localStorage.setItem('lbricol_pending_quick_order', JSON.stringify(data));
      setShowClientWhatsAppPopup(true);
      return;
    }

    setIsProgramming(true);
    try {
      const {
        service, subService, taskSize, description, bricolerId,
        bricolerName, bricolerAvatar, bricolerRating, bricolerRank, bricolerJobsCount,
        city, area, date, time, totalPrice, basePrice, serviceFee,
        frequency, images, paymentMethod, bankReceipt
      } = data;

      let finalTotalPrice = totalPrice || 0;
      let usedDiscount = 0;

      // Check if we should apply a referral discount
      try {
        const userRef = doc(db, 'users', effectiveUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().referralDiscountAvailable) {
          usedDiscount = userSnap.data().referralDiscountAvailable;
          if (!data.referralApplied) {
            finalTotalPrice = Math.max(0, finalTotalPrice - usedDiscount);
          }
          await updateDoc(userRef, { referralDiscountAvailable: 0 });

          const referrerId = userSnap.data().referredBy;
          if (referrerId) {
            const referrerRef = doc(db, 'users', referrerId);
            const referrerSnap = await getDoc(referrerRef);
            if (referrerSnap.exists()) {
              const rData = referrerSnap.data();
              if (rData.isProvider) {
                await updateDoc(referrerRef, { bricolerReferralBalance: increment(20) });
              } else {
                await updateDoc(referrerRef, { referralBalance: increment(20) });
              }
            }
          }
          await updateDoc(userRef, { referralRewardIssued: true });

        }
      } catch (e) {
        console.warn("Could not check referral discount in quick order:", e);
      }

      const jobData = {

        clientId: effectiveUser.uid,
        clientName: effectiveUser.displayName || "Anonymous",
        clientAvatar: effectiveUser.photoURL || "",
        service: service || "General",
        subService: subService || null,
        subServiceDisplayName: subService ? (data.subServiceName || subService) : null,
        date: date || new Date().toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' }),
        time: time || "As soon as possible",
        status: bricolerId && bricolerId !== 'open' ? 'programmed' : 'new',
        offers: [],
        bricolerId: bricolerId || null,
        bricolerName: bricolerName || null,
        bricolerAvatar: bricolerAvatar || null,
        bricolerRating: bricolerRating || null,
        bricolerRank: bricolerRank || null,
        bricolerJobsCount: bricolerJobsCount || null,
        bricolerWhatsApp: data.bricolerWhatsApp || null,
        offeredTo: bricolerId && bricolerId !== 'open' ? [bricolerId] : [],
        city: city || "",
        area: area || "",
        createdAt: serverTimestamp(),
        title: service || "New Job",
        description: description || "",
        taskSize: taskSize || "medium",
        clientWhatsApp: effectiveWhatsApp || "",
        bricolersCount: 1,
        price: finalTotalPrice || 0,
        basePrice: finalTotalPrice ? (finalTotalPrice / 1.15) : 0,
        serviceFee: finalTotalPrice ? (finalTotalPrice - (finalTotalPrice / 1.15)) : 0,
        totalPrice: finalTotalPrice || 0,
        frequency: frequency || 'once',
        images: images || [],
        paymentMethod: paymentMethod || 'cash',
        bankReceipt: bankReceipt || null
      };

      if (frequency && frequency !== 'once') {
        const baseDate = date && date !== 'Flexible' ? new Date(date) : new Date();
        const nextDate = new Date(baseDate);
        if (frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (frequency === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
        else if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        (jobData as any).nextRunDate = nextDate.toISOString();
      }

      // Upload images synchronously before saving — isProgramming/SplashScreen is already showing.
      // Each upload races against a 60s timeout so a single slow upload can't hang the flow.
      if (jobData.images && jobData.images.length > 0) {
        const uploadPromises = (jobData.images as string[]).map(async (img: string, idx: number) => {
          if (!isImageDataUrl(img)) return img; // already a URL, keep as-is
          try {
            const blob = await dataUrlToBlob(img);
            const path = `orders/${effectiveUser.uid}/${Date.now()}_${idx}.jpg`;
            const storageRef = ref(storage, path);
            const result = await Promise.race([
              uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' }).then(() => getDownloadURL(storageRef)),
              new Promise<null>((_, reject) => setTimeout(() => reject(new Error('IMAGE_UPLOAD_TIMEOUT')), 60000))
            ]);
            return result;
          } catch (err) {
            console.error(`Order image upload failed (idx ${idx}):`, err);
            return null; // skip failed images, don't block the order
          }
        });
        const resolved = await Promise.all(uploadPromises);
        jobData.images = resolved.filter(Boolean) as string[];
      }

      const docRef = await addDoc(collection(db, 'jobs'), jobData);
      console.log("Quick Job saved with ID:", docRef.id);
      // Check and upload bank receipt if it's a data URL
      if (jobData.bankReceipt && isImageDataUrl(jobData.bankReceipt)) {
        try {
          const blob = await dataUrlToBlob(jobData.bankReceipt);
          const path = `receipts/${effectiveUser.uid}/${Date.now()}_receipt.jpg`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
          jobData.bankReceipt = await getDownloadURL(storageRef);
        } catch (err) {
          console.error("Failed to upload pending data URL receipt", err);
          jobData.bankReceipt = null;
        }
      }

      // Note: order was already saved above (before image uploads) so docRef is available

      // Activity Log
      await addDoc(collection(db, 'activity'), {
        type: 'new_order',
        clientId: effectiveUser.uid,
        service: service || "General",
        city: city || selectedCity || "",
        jobId: docRef.id,
        timestamp: serverTimestamp()
      });

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast({
        variant: 'success',
        title: t({ en: "Mission Posted!", fr: "Mission Publiée !" }),
        description: t({ en: "Pros are being notified.", fr: "Les pros sont prévenus." })
      });

      setShowOrderFlow(false);
      setSelectedOrderId(docRef.id);

      // GUARANTEE CLIENT STATUS
      await setDoc(doc(db, 'clients', effectiveUser.uid), {
        uid: effectiveUser.uid,
        name: effectiveUser.displayName,
        email: effectiveUser.email,
        whatsappNumber: effectiveWhatsApp,
        createdAt: serverTimestamp()
      }, { merge: true });

      if (isMobile) {
        setMobileNavTab('calendar');
      } else {
        setShowFloatingCalendar(true);
        setIsCalendarExpanded(true);
      }

    } catch (error: any) {
      console.error("Error in Quick Order Submit:", error);
      showToast({ variant: 'error', title: t({ en: "Failed to post mission.", fr: "Échec de la publication de la mission." }) });
    } finally {
      setIsProgramming(false);
    }
  };


  const [isLoggingIn, setIsLoggingIn] = useState(false);


  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    console.log("[handleGoogleLogin] Starting authentication");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Fetch existing user data first to get WhatsApp number if it exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      let existingData: any = {};
      if (userSnap.exists()) {
        existingData = userSnap.data();
        setUserData(existingData);
      }

      // Create/update user profile globally
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        ...existingData
      }, { merge: true });

      // If we just read it, userData is set. If it was new, existingData is empty.

      // Update local state
      setCurrentUser(user);
      setShowAuthPopup(false);

      console.log("[handleGoogleLogin] Success");
      return { user, userData: existingData };

    } catch (error: any) {
      console.error("[handleGoogleLogin] Error:", error);
      if (error.code === 'auth/popup-blocked') {
        showToast({
          variant: 'error',
          title: t({
            en: "Login popup was blocked.",
            fr: "Le popup de connexion a été bloqué."
          }),
          description: t({
            en: "Please allow popups for this site.",
            fr: "Veuillez autoriser les popups."
          })
        });
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log("Popup request was cancelled by a new request - this is usually harmless.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Silent
      } else {
        showToast({
          variant: 'error',
          title: t({ en: "Login failed.", fr: "Échec de connexion." }),
          description: error.message
        });
      }
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const heroVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const heroItemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: "spring" as const,
        stiffness: 70,
        damping: 15,
        mass: 1
      }
    }
  };

  const isFullscreenMobileTab = isMobile && ['profile', 'share', 'promocodes', 'calendar', 'messages', 'heroes'].includes(mobileNavTab);

  return (
    <div style={{ backgroundColor: c.bg, color: c.text, minHeight: '100vh', scrollBehavior: 'smooth' }} className="font-sans">
      <AnimatePresence>
        {(showSplash || isProgramming) && <SplashScreen key="splash" />}
      </AnimatePresence>



      <RatingPopup
        isOpen={!!jobToRate}
        onClose={() => setJobToRate(null)}
        jobId={jobToRate?.id || ''}
        bricolerId={jobToRate?.bricolerId || ''}
        bricolerName={jobToRate?.bricolerName || 'Bricoler'}
        bricolerAvatar={jobToRate?.bricolerAvatar}
        serviceName={jobToRate?.service || ''}
        serviceId={jobToRate?.service}
        subServiceName={jobToRate?.subServiceDisplayName || jobToRate?.subService}
        orderDate={jobToRate?.date}
        orderTime={jobToRate?.time}
      />

      {!isFullscreenMobileTab && (
        <div className="md:hidden">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isBricoler={isBricoler}
            user={currentUser}
          />
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
      />
      <main style={{
        backgroundColor: isFullscreenMobileTab ? 'transparent' : c.bg,
        paddingBottom: isMobile ? ((mobileNavTab === 'calendar' || mobileNavTab === 'messages' || mobileNavTab === 'share' || mobileNavTab === 'promocodes') ? '0' : '80px') : '0',
        overflow: isMobile && (mobileNavTab === 'calendar' || mobileNavTab === 'messages' || mobileNavTab === 'share' || mobileNavTab === 'promocodes') ? 'hidden' : 'visible',
        height: isFullscreenMobileTab ? '100dvh' : 'auto'
      }}>
        {/* Show mobile tab views only on mobile */}
        {isMobile && mobileNavTab !== 'home' && (
          <>
            {mobileNavTab === 'calendar' && (
              isAdminMode ? (
                <AdminOrdersView
                  t={t}
                  onViewMessages={(jobId) => {
                    setMobileNavTab('messages');
                    setSelectedOrderId(jobId);
                  }}
                  onChat={(jobId, bricolerId, bricolerName) => {
                    setImpersonatedBricoler({ id: bricolerId, name: bricolerName });
                    setMobileNavTab('messages');
                    setSelectedOrderId(jobId);
                  }}
                />
              ) : (
                <ClientOrdersView
                  orders={orders}
                  onViewMessages={(jobId) => {
                    setMobileNavTab('messages');
                    setSelectedOrderId(jobId);
                  }}
                  initialShowHistory={showHistoryInOrders}
                  onResumeDraft={(draft: DraftOrder) => {
                    setService(draft.service);
                    setSubService(draft.subService || '');
                    setSelectedCity(draft.city);
                    setSelectedArea(draft.area);
                    setSelectedDraft(draft);
                    setShowOrderFlow(true);
                  }}
                />
              )
            )}

            {mobileNavTab === 'messages' && (
              <MessagesView
                orders={orders}
                currentUser={currentUser}
                initialSelectedJobId={selectedOrderId}
                impersonateBricoler={impersonatedBricoler || undefined}
                onBackToOrders={() => {
                  setMobileNavTab('calendar');
                  setShowHistoryInOrders(false);
                  setImpersonatedBricoler(null);
                }}
              />
            )}

            {mobileNavTab === 'heroes' && (
              <HeroesView orders={orders} />
            )}

            {mobileNavTab === 'performance' && isAdminMode && (
              <AdminDashboard t={t} />
            )}

            {mobileNavTab === 'services' && isAdminMode && (
              <AdminBricolersView t={t} />
            )}

            {mobileNavTab === 'profile' && (
              <ProfileView
                userAvatar={userData?.profilePhotoURL || userData?.photoURL || currentUser?.photoURL || undefined}
                userName={userData?.name || currentUser?.displayName || undefined}
                userEmail={currentUser?.email || undefined}
                isBricoler={isBricoler}
                isAuthenticated={!!currentUser}
                onNavigate={(path) => {
                  if (path === '/orders') {
                    setMobileNavTab('calendar');
                    setShowHistoryInOrders(false);
                  } else if (path === '/orders-history') {
                    setMobileNavTab('calendar');
                    setShowHistoryInOrders(true);
                  } else if (path === '/home') setMobileNavTab('home');
                  else if (path === '/share') setMobileNavTab('share');
                  else if (path === '/promocodes') setMobileNavTab('promocodes');
                  else if (path === '/admin/create-bricoler') setShowAdminBricolerCreator(true);
                }}
                onBricolerAction={handleProfileBricolerAction}
                onAdminAction={handleAdminAction}
                isAdmin={isAdmin}
                variant={isAdminMode ? 'admin' : 'client'}
                onOpenLanguage={() => setShowLanguagePopup(true)}
                onLogin={() => setShowAuthPopup(true)}
                onLogout={async () => {
                  try {
                    await signOut(auth);
                    showToast({
                      title: t({ en: 'Logged out successfully', fr: 'Déconnexion réussie' }),
                      variant: 'success'
                    });
                  } catch (error) {
                    console.error('Logout error:', error);
                    showToast({
                      title: t({ en: 'Failed to log out', fr: 'Échec de la déconnexion' }),
                      variant: 'error'
                    });
                  }
                }}
              />
            )}

            <AnimatePresence>
              {showAdminBricolerCreator && (
                <div
                  className="fixed inset-0 z-[1001] bg-white overflow-y-auto pt-12 px-5"
                >
                  <div className="max-w-md mx-auto">
                    <button
                      onClick={() => setShowAdminBricolerCreator(false)}
                      className="mb-8 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"
                    >
                      <X size={20} />
                    </button>
                    <AdminBricolerCreator t={t} onBack={() => setShowAdminBricolerCreator(false)} />
                  </div>
                </div>
              )}
            </AnimatePresence>

            {mobileNavTab === 'share' && (
              <ShareAndEarnView
                currentUser={currentUser}
                onBack={() => setMobileNavTab('profile')}
                onLogin={() => setShowAuthPopup(true)}
              />
            )}

            {mobileNavTab === 'promocodes' && (
              <PromocodesView
                currentUser={currentUser}
                onBack={() => setMobileNavTab('profile')}
              />
            )}
          </>
        )}

        {/* Client Notifications View */}
        <AnimatePresence>
          {showClientNotifications && (
            <div className="fixed inset-0 z-[1001] bg-white">
              <ClientNotificationsView
                onBack={() => setShowClientNotifications(false)}
                onNavigateToOrder={(jobId) => {
                  setShowClientNotifications(false);
                  setMobileNavTab('calendar');
                }}
                onNavigateToMessages={(jobId) => {
                  setShowClientNotifications(false);
                  setSelectedOrderId(jobId);
                  setMobileNavTab('messages');
                }}
              />
            </div>
          )}
          {showAdminNotifications && isAdminMode && (
            <div className="fixed inset-0 z-[1001] bg-white">
              <AdminNotificationsView
                onBack={() => setShowAdminNotifications(false)}
                onNavigateToReceivables={() => {
                  setShowAdminNotifications(false);
                  setShowAdminReceivables(true);
                }}
              />
            </div>
          )}
          {showAdminReceivables && isAdminMode && (
            <div className="fixed inset-0 z-[1001] bg-white">
              <AdminReceivablesView
                onBack={() => setShowAdminReceivables(false)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Show home content when on home tab (mobile) or always (desktop) */}
        {(!isMobile || mobileNavTab === 'home' || mobileNavTab === 'search') && !showSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col"
          >
            {/* On mobile: Glovo-style flash home; on desktop: full hero */}
            {isMobile && mobileNavTab === 'home' && !isAdminMode && (
              <div className="fixed top-8 right-6 z-[110]">
                <button
                  onClick={() => setShowClientNotifications(true)}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-lg border border-neutral-100 relative active:scale-90 transition-transform"
                >
                  <Bell size={24} strokeWidth={2.5} className="text-black" />
                  {unreadNotifsCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"
                    >
                      <span className="text-[9px] font-black text-white">{unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}</span>
                    </motion.div>
                  )}
                </button>
              </div>
            )}

            {/* Admin Notifications Bell (Floating) */}
            {isAdminMode && (
              <div className="fixed top-8 right-6 z-[110]">
                <button
                  onClick={() => setShowAdminNotifications(true)}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-lg border border-neutral-100 relative active:scale-90 transition-transform"
                >
                  <Bell size={24} strokeWidth={2.5} className="text-black" />
                  <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-[9px] font-black text-white">!</span>
                  </div>
                </button>
              </div>
            )}

            {isMobile ? (
              <ClientHome
                userName={currentUser?.displayName || undefined}
                selectedCity={selectedCity}
                selectedArea={selectedArea}
                recentOrders={orders.filter(o => o.status !== 'cancelled')}
                onSelectService={(serviceName: string, sub?: string) => {
                  const cfg = getServiceById(serviceName);
                  const finalSvc = cfg?.id || serviceName;
                  let finalSub = sub || null;
                  if (cfg && sub) {
                    const subCfg = cfg.subServices.find(ss => ss.id === sub || ss.name === sub);
                    if (subCfg) finalSub = subCfg.id;
                  }
                  setService(finalSvc);
                  setSubService(finalSub);
                  setSelectedDraft(null);
                  setShowOrderFlow(true);
                }}
                availableServiceIds={availableServices.length > 0 ? availableServices : cityServices}
                availableSubServiceIds={availableSubServices.length > 0 ? availableSubServices : citySubServices}
                trendingSubServiceIds={trendingSubServices}
                popularServiceIds={popularServiceIds}

                onChangeLocation={() => setShowCityPopup(true)}
                onNavigateToShare={() => setMobileNavTab('share')}
                showOnboarding={showClientOnboarding}
                onOnboardingComplete={() => {
                  localStorage.setItem('client_onboarding_shown', 'true');
                  setShowClientOnboarding(false);
                }}
                onBecomeBricoler={() => {
                  if (currentUser) {
                    setShowMobileOnboarding(true);
                  } else {
                    setShowAuthPopup(true);
                  }
                }}
              />
            ) : (

              <>

                {/* Hero Section */}
                <DesktopHeroScroll
                  onOrderClick={(serviceId) => {
                    setService(serviceId || "");
                    setSubService(null);
                    setSelectedDraft(null);
                    setShowOrderFlow(true);
                  }}
                  onBecomeBricolerClick={() => {
                    if (currentUser && isBricoler) {
                      window.location.href = '/provider';
                    } else if (currentUser) {
                      setShowMobileOnboarding(true);
                    } else {
                      setShowAuthPopup(true);
                    }
                  }}
                />


                {/* Recent Activity Carousel */}
                {
                  orders.filter(o => o.status !== 'cancelled').length > 0 && (
                    <section style={{ padding: '2rem 0 4rem', backgroundColor: c.bg }}>
                      <div style={{ maxWidth: '1270px', margin: '0 auto', padding: '0 1.5rem' }}>
                        <OrderHistoryCarousel
                          orders={orders.filter(o => o.status !== 'cancelled')}
                          onSelectOrder={(order) => {
                            setSelectedOrderId(order.id || null);
                            if (isMobile) {
                              setMobileNavTab('calendar');
                            } else {
                              setIsCalendarExpanded(true);
                            }
                          }}
                        />
                      </div>
                    </section>
                  )
                }


                {/* Floating Calendar Widget */}
                {!isMobile && (
                  <AnimatePresence>
                    {showFloatingCalendar && (
                      <>
                        {/* Minimized State: Floating Buttons Stack */}
                        {!isCalendarExpanded && !showMessagesModal && (
                          <div style={{
                            position: 'fixed',
                            bottom: '2.5rem',
                            right: '2.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            zIndex: 2000
                          }}>
                            {/* Floating Message Button */}
                            {currentUser && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                transition={{ delay: 0.05 }}
                                whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowMessagesModal(true)}
                                style={{
                                  width: '72px',
                                  height: '72px',
                                  backgroundColor: '#fff',
                                  borderRadius: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#000',
                                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                  cursor: 'pointer',
                                  border: '1.5px solid #E2E2E2',
                                  position: 'relative'
                                }}
                              >
                                <MessageSquare size={28} strokeWidth={2.5} />
                                {/* Unread badge */}
                                {orders.some(o => o.id && (o.bricolerId || o.clientId)) && (
                                  <div style={{
                                    position: 'absolute',
                                    top: -5,
                                    right: -5,
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: '#007AFF',
                                    borderRadius: '50%',
                                    border: '3px solid #FFF',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
                                    color: '#FFF'
                                  }}>
                                    {orders.filter(o => o.id && (o.bricolerId || o.clientId)).length}
                                  </div>
                                )}
                              </motion.div>
                            )}

                            {/* Floating Calendar Button */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: 20 }}
                              whileHover={{ scale: 1.05, boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setIsCalendarExpanded(true)}
                              style={{
                                width: '72px',
                                height: '72px',
                                backgroundColor: '#000',
                                borderRadius: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              <Calendar size={28} strokeWidth={2.5} />
                              <div style={{
                                position: 'absolute',
                                top: -5,
                                right: -5,
                                width: '24px',
                                height: '24px',
                                backgroundColor: '#FF3B30',
                                borderRadius: '50%',
                                border: '3px solid #FFF',
                                fontSize: '12px',
                                fontWeight: 900,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(255,59,48,0.3)',
                                color: '#FFF'
                              }}>
                                {orders.filter(o => o.status !== 'cancelled').length || 3}
                              </div>
                            </motion.div>
                          </div>
                        )}

                        {/* Expanded State: Clean Modal */}
                        {isCalendarExpanded && (
                          <div
                            style={{
                              position: 'fixed',
                              inset: 0,
                              zIndex: 3000,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                backdropFilter: 'blur(8px)',
                              }}
                              onClick={() => {
                                setIsCalendarExpanded(false);
                                setSelectedOrderId(null);
                              }}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 100, scale: 0.9, rotate: -5 }}
                              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                              exit={{ opacity: 0, y: 100, scale: 0.9, rotate: -5 }}
                              transition={{ type: "spring", damping: 25, stiffness: 300 }}
                              style={{
                                position: 'relative',
                                width: '100vw',
                                maxWidth: '100vw',
                                height: '100vh',
                                maxHeight: '100vh',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: isMobile ? '0' : '1rem' }} className="no-scrollbar">
                                <WeekCalendar
                                  orders={orders}
                                  variant="card"
                                  isLoading={loadingOrders}
                                  onUpdateOrder={handleUpdateOrder}
                                  onCancelOrder={handleCancelOrder}
                                  onNewOrder={() => {
                                    setIsCalendarExpanded(false);
                                    handleScrollToSearch();
                                  }}
                                  externalSelectedOrderId={selectedOrderId}
                                  newlyProgrammedOrderId={newlyProgrammedOrderId}
                                  userType="client"
                                  autoChat={autoChatOrderId === selectedOrderId}
                                  onViewProvider={setViewingProviderId}
                                  activeTab={activeTab}
                                  onTabChange={setActiveTab}
                                />
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </>
                    )}
                  </AnimatePresence>
                )}

                {/* Web Messages Modal */}
                {!isMobile && (
                  <AnimatePresence>
                    {showMessagesModal && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                          position: 'fixed',
                          inset: 0,
                          zIndex: 4000,
                          display: 'flex',
                          alignItems: 'stretch',
                          justifyContent: 'flex-end'
                        }}
                      >
                        {/* Backdrop */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(8px)',
                          }}
                          onClick={() => {
                            setShowMessagesModal(false);
                            setMessagesModalJobId(null);
                          }}
                        />

                        {/* Messages Panel */}
                        <motion.div
                          initial={{ x: '100%', opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: '100%', opacity: 0 }}
                          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                          style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '900px',
                            height: '100vh',
                            backgroundColor: theme === 'light' ? '#FFFFFF' : '#000000',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Panel Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '20px 24px',
                            borderBottom: `1px solid ${theme === 'light' ? '#EBEBEB' : '#2D2D2D'}`,
                            flexShrink: 0,
                            backgroundColor: theme === 'light' ? '#FFFFFF' : '#000000'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '14px',
                                backgroundColor: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <MessageSquare size={20} color="#fff" strokeWidth={2.5} />
                              </div>
                              <div>
                                <div style={{ fontSize: '20px', fontWeight: 950, color: theme === 'light' ? '#000' : '#fff', letterSpacing: '-0.02em', fontFamily: 'Uber Move, var(--font-sans)' }}>
                                  {t({ en: 'Messages', fr: 'Messages' })}
                                </div>
                                <div style={{ fontSize: '12px', color: theme === 'light' ? '#717171' : '#B0B0B0', fontWeight: 700 }}>
                                  {orders.filter(o => o.id && (o.bricolerId || o.clientId)).length} {t({ en: 'conversations', fr: 'conversations' })}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setShowMessagesModal(false);
                                setMessagesModalJobId(null);
                              }}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '14px',
                                backgroundColor: theme === 'light' ? '#F5F5F7' : '#1A1A1A',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: theme === 'light' ? '#000' : '#fff'
                              }}
                            >
                              <X size={20} />
                            </button>
                          </div>

                          {/* Messages Content */}
                          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <MessagesView
                              orders={orders}
                              currentUser={currentUser}
                              initialSelectedJobId={messagesModalJobId}
                              isModal={true}
                              onBackToOrders={() => setShowMessagesModal(false)}
                            />
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}


                {/* Info Section */}
                <section style={{ padding: '6rem 0', backgroundColor: c.bg }}>
                  <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
                    <h2 style={{
                      fontSize: isMobile ? '1.75rem' : '2.5rem',
                      fontWeight: 800,
                      marginBottom: '4rem',
                      color: c.text,
                      textAlign: 'start',
                      fontFamily: 'Uber Move, var(--font-sans)'
                    }}>
                      {t({ en: 'How it works', fr: 'Comment ça marche', ar: 'كيف يعمل لبريكول' })}
                    </h2>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: isMobile ? '4rem' : '1rem',
                      position: 'relative',
                      paddingLeft: isMobile ? '2.5rem' : '0' // Room for line on mobile
                    }}>
                      {/* Vertical Line */}
                      <div style={{
                        position: 'absolute',
                        left: isMobile ? '0' : '50%',
                        top: '20px',
                        bottom: isMobile ? '100px' : '220px',
                        width: '1px',
                        backgroundColor: '#000', // Black line like Uber
                        zIndex: 0
                      }} />

                      {[
                        {
                          img: "/Images/How to images/Step1-how_to_use.webp",
                          title: t({ en: '1. Program your order', fr: '1. Programmez votre commande', ar: '1. برمج طلبك' }),
                          desc: t({
                            en: 'Pick a service, Confirm Location, Define the size of the task, review and choose a bricoler, pickup date & time slot and confirm. It only takes a minute.',
                            fr: 'Choisissez un service, Confirmez l\'emplacement, Définissez la taille de la tâche, examinez et choisissez un bricoleur, choisissez la date et l\'heure et confirmez. Cela ne prend qu\'une minute.',
                            ar: 'اختر الخدمة، قم بتأكيد الموقع، حدد حجم المهمة، راجع واختر مقدّم الخدمة، اختر التاريخ والوقت وأكد. يستغرق الأمر دقيقة واحدة فقط.'
                          })
                        },
                        {
                          img: "/Images/How to images/Step4-Chat in-app with Bricolers.webp",
                          title: t({ en: '2. Chat directly', fr: '2. Discutez en direct', ar: '2. تواصل مباشرة' }),
                          desc: t({
                            en: 'Once matched with a Bricoler, you can message them directly in the app to share your location and any additional details.',
                            fr: 'Une fois mis en relation avec un Bricoler, vous pouvez lui envoyer un message directement dans l\'application pour partager votre localisation et tout autre détail.',
                            ar: 'بمجرد التوافق مع مقدم الخدمة، يمكنك مراسلته مباشرة في التطبيق لمشاركة موقعك وأي تفاصيل إضافية.'
                          })
                        }
                      ].map((item, i, arr) => (
                        <div key={i} style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: 'flex-start',
                          gap: isMobile ? '1.5rem' : '0',
                          position: 'relative',
                          zIndex: 1,
                          paddingBottom: isMobile ? '1rem' : '0'
                        }}>
                          {/* Timeline Marker (Dot) Area for Mobile */}
                          {isMobile && (
                            <div style={{
                              position: 'absolute',
                              left: '-2.5rem',
                              top: '20px',
                              width: '1px',
                              height: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#000',
                                position: 'absolute',
                                top: 0,
                                transform: 'translateX(-4px)',
                                borderRadius: '1px'
                              }} />
                            </div>
                          )}

                          {!isMobile && (
                            <div style={{
                              flex: 1,
                              display: 'flex',
                              justifyContent: 'flex-end',
                              width: '100%'
                            }}>
                              <div style={{
                                width: '350px',
                                height: '230px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                backgroundColor: c.surface,
                                boxShadow: 'none'
                              }}>
                                <img
                                  src={item.img}
                                  alt={item.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Timeline Marker (Dot) Area for Desktop */}
                          {!isMobile && (
                            <div style={{
                              width: '80px',
                              display: 'flex',
                              justifyContent: 'center',
                              paddingTop: '20px'
                            }}>
                              <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: '#000',
                                borderRadius: '1px'
                              }} />
                            </div>
                          )}

                          {/* Text Area */}
                          <div style={{
                            flex: 1,
                            paddingTop: isMobile ? '0.5rem' : '15px',
                            paddingBottom: i === arr.length - 1 ? '0' : (isMobile ? '0' : '100px'),
                            textAlign: 'start'
                          }}>
                            <h3 style={{
                              fontSize: isMobile ? '1.25rem' : '1.5rem',
                              fontWeight: 900,
                              marginBottom: '0.75rem',
                              color: c.text,
                              fontFamily: 'Uber Move, var(--font-sans)',
                              letterSpacing: '-0.02em'
                            }}>
                              {item.title}
                            </h3>
                            <p style={{
                              color: c.text,
                              lineHeight: 1.6,
                              fontWeight: 500,
                              maxWidth: '400px',
                              opacity: 0.8,
                              fontSize: isMobile ? '15px' : '16px'
                            }}>
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                </section>

                <MillionsImpactSection />

                <MoroccoServiceMap />



                <div className="md:hidden"><Footer /></div>




              </>
            )}

          </motion.div>
        )}

        <AuthPopup
          isOpen={showAuthPopup}
          onClose={() => setShowAuthPopup(false)}
          onSuccess={async () => {
            const result = await handleGoogleLogin();
            if (result && result.user) {
              setShowAuthPopup(false);
              // Small timeout to allow popups to close
              setTimeout(() => {
                const pendingData = pendingQuickOrder || (localStorage.getItem('lbricol_pending_quick_order') ? JSON.parse(localStorage.getItem('lbricol_pending_quick_order')!) : null);

                if (pendingData) {
                  setPendingQuickOrder(null);
                  localStorage.removeItem('lbricol_pending_quick_order');
                  handleQuickOrderSubmit(pendingData, result.userData?.whatsappNumber, result.user);
                } else {
                  handleProgramOrder(result.user, result.userData?.whatsappNumber);
                }
              }, 400);
            }
          }}
        />

        <ClientWhatsAppPopup
          isOpen={showClientWhatsAppPopup}
          onClose={() => setShowClientWhatsAppPopup(false)}
          onSuccess={handleWhatsAppSuccess}
        />

        <AnimatePresence>
          {isProgramming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                color: c.text
              }}
            >
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <motion.div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `3px solid ${c.border}`,
                    opacity: 0.3
                  }}
                />
                <motion.div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `3px solid ${c.text}`,
                    borderTopColor: 'transparent'
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  marginTop: '2rem',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  fontFamily: 'Uber Move, var(--font-sans)',
                  letterSpacing: '-0.02em'
                }}
              >
                {t({ en: 'Programming your service...', fr: 'Programmation de votre service...' })}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.9rem',
                  color: c.textMuted,
                  fontWeight: 600
                }}
              >
                {t({ en: 'Providers will be notified instantly.', fr: 'Les prestataires seront notifiés instantanément.' })}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Matching Overlay (inDrive Style) */}
        {
          (() => {
            const allNotifications: any[] = [];
            orders.forEach(job => {
              if (job.status === 'new' || job.status === 'negotiating') {
                const providerOffers: Record<string, any> = {};
                job.offers?.forEach(offer => {
                  if (offer.sender === 'client') return;
                  providerOffers[offer.bricolerId] = offer;
                });
                Object.values(providerOffers).forEach(offer => {
                  const offerId = `${job.id}_${offer.bricolerId}_${offer.timestamp?.seconds || '0'}`;
                  if (!dismissedOffers.includes(offerId)) {
                    const isAcceptance = Number(offer.price) === Number(job.price);
                    allNotifications.push({
                      type: 'offer',
                      jobId: job.id,
                      jobTitle: job.service,
                      jobSubService: job.subServiceDisplayName || '',
                      jobDate: job.date,
                      jobTime: job.time,
                      data: offer,
                      isAcceptance
                    });
                  }
                });
              }
            });
            incomingMessages.forEach(msg => {
              if (!dismissedMessages.includes(msg.id)) {
                allNotifications.push({ type: 'message', jobId: msg.jobId, jobTitle: msg.serviceTitle, data: msg });
              }
            });
            const visibleNotifications = allNotifications.filter(n => n.type === 'offer');
            if (visibleNotifications.length === 0) return null;
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(2px)', pointerEvents: 'auto' }}
                />
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '480px', padding: '1rem', pointerEvents: 'auto' }}>
                  <AnimatePresence mode="popLayout">
                    {visibleNotifications.map((noti, idx) => {
                      if (noti.type === 'offer') {
                        const { jobId, jobTitle, jobSubService, jobDate, jobTime, data: offer, isAcceptance } = noti;
                        const offerId = `${jobId}_${offer.bricolerId}_${offer.timestamp?.seconds || '0'}`;
                        const accentColor = isAcceptance ? '#06C167' : '#5856D6';
                        return (
                          <motion.div
                            key={offerId}
                            layout
                            initial={{ opacity: 0, y: 50, scale: 0.9, rotate: idx % 2 === 0 ? -2 : 2 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                            transition={{ type: "spring", damping: 15, stiffness: 150 }}
                            style={{ backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A1A1A', borderRadius: '40px', padding: '2rem', boxShadow: '0 40px 100px rgba(0,0,0,0.25)', border: `3px solid ${accentColor}`, display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', position: 'relative' }}
                          >
                            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', backgroundColor: accentColor, color: '#FFF', padding: '4px 20px', borderRadius: '100px', fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                              {isAcceptance ? t({ en: 'PRICE ACCEPTED', fr: 'PRIX ACCEPTE' }) : t({ en: 'NEW COUNTER OFFER', fr: 'NOUVELLE CONTRE-OFFRE' })}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <motion.div onClick={() => setViewingProviderId(offer.bricolerId)} whileHover={{ scale: 1.02, backgroundColor: theme === 'light' ? '#F5F5F7' : '#222' }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', padding: '12px', borderRadius: '24px', border: `1px solid ${c.border}` }}>
                                <div style={{ position: 'relative' }}>
                                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: c.surface, overflow: 'hidden', border: `1px solid ${c.border}` }}>
                                    {offer.avatar ? <img src={offer.avatar} alt={offer.bricolerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textMuted }}><UserIcon size={28} /></div>}
                                  </div>
                                  {offer.jobsCount > 0 && <div style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: '#FFC244', color: '#000', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '2px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', border: '1.5px solid #FFF' }}><Star size={9} fill="#000" strokeWidth={0} /><span>{offer.rating ? Number(offer.rating).toFixed(1) : '5.0'}</span></div>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h4 style={{ margin: 0, fontSize: '18px', fontWeight: 950, color: c.text }}>{offer.bricolerName}</h4><div style={{ fontSize: '20px', fontWeight: 950, color: accentColor }}>{offer.price} <span style={{ fontSize: '11px', opacity: 0.6 }}>MAD</span></div></div></div>
                              </motion.div>
                              <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}><div style={{ fontSize: '11px', fontWeight: 900, color: c.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{jobTitle}</div><div style={{ fontSize: '15px', fontWeight: 800, color: c.text }}>{jobSubService || t({ en: 'Standard Service', fr: 'Service Standard' })}</div><div style={{ fontSize: '13px', fontWeight: 600, color: c.textMuted, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}><Calendar size={14} /> <span>{jobDate ? jobDate.split(' at ')[0] : ''}</span><Clock size={14} /> <span>{jobTime || (jobDate ? jobDate.split(' at ')[1] : '')}</span></div></div>
                            </div>
                            {offer.comment && <div style={{ padding: '0.75rem 1rem', backgroundColor: c.surface, borderRadius: '16px', fontSize: '13px', color: c.textMuted, fontWeight: 500, fontStyle: 'italic' }}>"{offer.comment}"</div>}
                            <div style={{ display: 'flex', gap: '0.75rem' }}><button onClick={() => handleAcceptOffer(jobId, offer, jobTitle)} style={{ flex: 2, padding: '0.85rem', borderRadius: '16px', backgroundColor: '#000000', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 900, cursor: 'pointer' }}>{t({ en: 'Accept', fr: 'Accepter' })}</button><button onClick={() => handleDeclineOffer(jobId, offer, jobTitle)} style={{ padding: '0.85rem', borderRadius: '16px', backgroundColor: c.surface, color: c.textMuted, border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
                          </motion.div>
                        );
                      }
                      return null;
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })()
        }

        {/* Client Counter Offer Modal */}
        <AnimatePresence>
          {showCounterModal && activeCounterOffer && (
            <div key="client-counter-modal" style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCounterModal(false)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} style={{ position: 'relative', backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A1A1A', width: '100%', maxWidth: '400px', borderRadius: '40px', padding: '2.5rem', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '24px', backgroundColor: '#06C16720', color: '#06C167', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <RotateCcw size={32} />
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 950, color: c.text, margin: 0, fontFamily: 'Uber Move, var(--font-sans)' }}>{t({ en: 'Counter Offer', fr: 'Contre-offre' })}</h3>
                  <p style={{ color: c.textMuted, fontSize: '14px', marginTop: '0.5rem', fontWeight: 500 }}>{t({ en: `Provider suggested ${activeCounterOffer.oldPrice} MAD. What is your offer?`, fr: `Le prestataire a suggéré ${activeCounterOffer.oldPrice} MAD. Quelle est votre offre ?` })}</p>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    value={counterInputPrice}
                    onChange={(e) => setCounterInputPrice(e.target.value)}
                    style={{ width: '100%', padding: '1.25rem', paddingLeft: '3.5rem', borderRadius: '20px', backgroundColor: c.surface, border: `2px solid ${c.border}`, fontSize: '20px', fontWeight: 900, color: c.text, outline: 'none' }}
                    placeholder="0"
                    autoFocus
                  />
                  <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: c.textMuted }}>MAD</div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setShowCounterModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '16px', backgroundColor: c.surface, color: c.text, border: 'none', fontWeight: 800, cursor: 'pointer' }}>{t({ en: 'Cancel', fr: 'Annuler' })}</button>
                  <button onClick={handleSendClientCounter} style={{ flex: 1, padding: '1rem', borderRadius: '16px', backgroundColor: '#000000', color: '#FFFFFF', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>{t({ en: 'Send Offer', fr: 'Envoyer' })}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {viewingProviderId && providerDetails && (
            <div key="provider-details-modal" style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingProviderId(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} style={{ position: 'relative', backgroundColor: '#FFFFFF', width: '100%', maxWidth: '520px', borderRadius: '40px', padding: '2.5rem', boxShadow: '0 30px 90px rgba(0,0,0,0.12)', border: `1px solid #F0F0F0`, display: 'flex', flexDirection: 'column', gap: '2rem', maxHeight: '85vh', overflowY: 'auto' }}>
                <div style={{ textAlign: 'center' }}><div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 1.5rem' }}><div style={{ width: '100%', height: '100%', borderRadius: '36px', backgroundColor: '#F9F9F9', overflow: 'hidden', border: `1.5px solid #F0F0F0` }}>{providerDetails.photoURL ? <img src={providerDetails.photoURL} alt={providerDetails.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D1D1D1' }}><UserIcon size={48} /></div>}</div></div><h3 style={{ fontSize: '32px', fontWeight: 950, color: '#000', margin: 0, lineHeight: 1 }}>{providerDetails.name || 'Bricoleur'}</h3></div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem' }}><button onClick={() => setViewingProviderId(null)} style={{ width: '100%', padding: '1.5rem', borderRadius: '24px', backgroundColor: '#000000', color: '#FFFFFF', border: 'none', fontSize: '16px', fontWeight: 950, cursor: 'pointer' }}>{t({ en: 'Close Profile', fr: 'Fermer le profil' })}</button></div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Navigation - only show on mobile */}
        {isMobile && !showSplash && !showClientOnboarding && <MobileBottomNav
          activeTab={mobileNavTab as any}
          onTabChange={(tab: any) => {
            if (tab === 'calendar' && mobileNavTab === 'calendar') {
              setCalendarKey(prev => prev + 1);
            }
            if (tab === 'calendar') setShowHistoryInOrders(false);
            setMobileNavTab(tab);
          }}
          variant={isAdminMode ? 'admin' : 'client'}
        />}

        <CitySelectionPopup
          isOpen={showCityPopup}
          onClose={() => setShowCityPopup(false)}
          onSelectCity={handleCitySelect}
        />

        <LanguagePreferencePopup
          isOpen={showLanguagePopup}
          onClose={() => {
            setShowLanguagePopup(false);
            if (!selectedCity && !localStorage.getItem('lbricol_preferred_city')) {
              setShowCityPopup(true);
            }
          }}
          onSelectLanguage={handleLanguageSelect}
        />

        <OnboardingPopup
          isOpen={showMobileOnboarding}
          onClose={() => {
            setShowMobileOnboarding(false);
            setShadowProfileData(null);
          }}
          mode={shadowProfileData ? 'edit' : 'onboarding'}
          userData={shadowProfileData}
          onComplete={async (data: { services: any[]; city: string }) => {
            setShowMobileOnboarding(false);
            setShadowProfileData(null);
            setIsBricoler(true);
            router.push('/provider');
          }}
        />

        <OrderSubmissionFlow
          isOpen={showOrderFlow}
          onClose={() => {
            setShowOrderFlow(false);
            setSelectedDraft(null);
          }}
          service={service}
          subService={subService || undefined}
          initialCity={selectedCity}
          initialArea={selectedArea}
          onSubmit={handleQuickOrderSubmit}
          continueDraft={selectedDraft}
        />

      </main>
    </div>
  );
};

export default Home;
