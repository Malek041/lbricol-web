"use client";

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Static imports
import Header from '@/components/layout/Header';
import SearchBox from '@/components/shared/SearchBox';
import Footer from '@/components/layout/Footer';
import OrderCard, { OrderDetails } from '@/features/orders/components/OrderCard';
import { DesktopHeroScroll } from '@/components/shared/DesktopHeroScroll';
import OrderHistoryCarousel from '@/features/orders/components/OrderHistoryCarousel';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { FloatingMessengerBubble } from '@/components/shared/FloatingMessengerBubble';
import ComingSoon from '@/components/layout/ComingSoon';
import ClientHome from '@/features/client/components/ClientHome';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
import { useOrder } from '@/context/OrderContext';
import { SavedAddress } from '@/components/location-picker/types';

// Dynamic imports
const CitySelectionPopup = dynamic(() => import('@/features/client/components/CitySelectionPopup'));
const AuthPopup = dynamic(() => import('@/features/onboarding/components/AuthPopup'));
const ClientWhatsAppPopup = dynamic(() => import('@/features/client/components/ClientWhatsAppPopup'));
const WeekCalendar = dynamic(() => import('@/features/calendar/components/WeekCalendar'));
const ClientOrdersView = dynamic(() => import('@/features/orders/components/ClientOrdersView'));
const HeroesView = dynamic(() => import('@/features/client/components/HeroesView'));
const ShareAndEarnView = dynamic(() => import('@/features/client/components/ShareAndEarnView'));
const PromocodesView = dynamic(() => import('@/features/client/components/PromocodesView'));
const MoroccoServiceMap = dynamic(() => import('@/components/shared/MoroccoServiceMap').then(mod => ({ default: mod.MoroccoServiceMap })));
const LanguagePreferencePopup = dynamic(() => import('@/features/onboarding/components/LanguagePreferencePopup'));
const MessagesView = dynamic(() => import('@/features/messages/components/MessagesView'));
const ProfileView = dynamic(() => import('@/features/provider/components/ProfileView'));
const OnboardingPopup = dynamic(() => import('@/features/onboarding/components/OnboardingPopup'));
const SearchPopup = dynamic(() => import('@/features/client/components/SearchPopup').then(mod => ({ default: mod.SearchPopup })));
const AdminDashboard = dynamic(() => import('@/features/admin/components/AdminDashboard'));
const AdminOrdersView = dynamic(() => import('@/features/orders/components/AdminOrdersView'));
const AdminBricolerCreator = dynamic(() => import('@/features/admin/components/AdminBricolerCreator'));
const AdminBricolersView = dynamic(() => import('@/features/admin/components/AdminBricolersView'));
const AdminNotificationsView = dynamic(() => import('@/features/admin/components/AdminNotificationsView'));
const AdminReceivablesView = dynamic(() => import('@/features/admin/components/AdminReceivablesView'));
const AdminReviewsView = dynamic(() => import('@/features/admin/components/AdminReviewsView'));
const LocationPicker = dynamic(() => import('@/components/location-picker/LocationPicker'));
const SplashScreen = dynamic(() => import('@/components/layout/SplashScreen'));
const RatingPopup = dynamic(() => import('@/features/orders/components/RatingPopup'));
const ClientNotificationsView = dynamic(() => import('@/features/client/components/ClientNotificationsView'));
const MillionsImpactSection = dynamic(() => import('@/components/shared/MillionsImpactSection'));
const DesktopOrderModal = dynamic(() => import('@/features/client/components/DesktopOrderModal').then(mod => ({ default: mod.DesktopOrderModal })));
const ServicesHeroSection = dynamic(() => import('@/components/shared/ServicesHeroSection'));
const OpportunitySection = dynamic(() => import('@/components/shared/OpportunitySection'));

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
import CompactHomeMap from '@/components/shared/CompactHomeMap';
import { getServiceById,
  getSubServiceName,
  getCategoryForSubService,
  type ServiceConfig,
  SERVICES_HIERARCHY
} from '@/config/services_config';
import { requestNotificationPermission, onMessageListener } from '@/lib/pushNotification';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS } from '@/config/moroccan_areas';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
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
  'Home repairs',
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
    case 'Home repairs':
    case 'handyman':
    case 'home_repairs':
      return t({ en: isPlural ? 'Bricolers' : 'Bricoler', fr: isPlural ? 'Bricoleurs' : 'Bricoleur' });
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
    case 'Handyman / small repairs':
    case 'Home repairs':
    case 'handyman':
    case 'home_repairs':
      return t({ en: 'Home repairs', fr: 'Bricolage' });
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

export default function HomeOrchestrator() {
  const router = useRouter();
  const { t, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const { setOrderState, setOrderField, resetOrder } = useOrder();
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
  const [mobileNavTab, setMobileNavTab] = useState<'home' | 'search' | 'heroes' | 'calendar' | 'messages' | 'profile' | 'share' | 'promocodes' | 'performance' | 'services' | 'reviews'>('home');
  const [calendarKey, setCalendarKey] = useState(0);
  const [activeSearchSection, setActiveSearchSection] = useState<string | null>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showAllServices, setShowAllServices] = useState(false);

  const [availableServices, setAvailableServices] = useState<string[] | null>(null);
  const [availableSubServices, setAvailableSubServices] = useState<string[] | null>(null);
  const [bricolersCountMap, setBricolersCountMap] = useState<Record<string, number>>({});
  const [serviceRatingsMap, setServiceRatingsMap] = useState<Record<string, number>>({});
  const [isBricoler, setIsBricoler] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedDesktopServiceId, setSelectedDesktopServiceId] = useState<string | null>(null);
  const [showDesktopSubServicePopup, setShowDesktopSubServicePopup] = useState(false);
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
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [autoLocateOnPickerOpen, setAutoLocateOnPickerOpen] = useState(false);
  const [userSavedAddresses, setUserSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number, address?: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOnboardingOpen, setIsProfileOnboardingOpen] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [sessionDismissedRatings, setSessionDismissedRatings] = useState<string[]>([]);

  const handleAddressUpdate = (address: string) => {
    if (!address) return;
    
    const parts = address.split(',').map(p => p.trim());
    const cities = ['Casablanca', 'Marrakech', 'Essaouira', 'Agadir', 'Tangier', 'Rabat', 'Fes', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan', 'Safi', 'Mohammedia', 'Khouribga', 'El Jadida', 'Beni Mellal', 'Nador', 'Taza', 'Settat'];
    
    let foundCity = null;
    let foundArea = null;

    for (const p of parts) {
      if (cities.includes(p)) {
        foundCity = p;
        break;
      }
    }

    if (foundCity) {
      const cityIdx = parts.indexOf(foundCity);
      if (cityIdx > 0) {
        foundArea = parts[cityIdx - 1];
      }
      
      if (foundCity !== selectedCity) {
        setSelectedCity(foundCity);
        localStorage.setItem('lbricol_preferred_city', foundCity);
      }
      if (foundArea && foundArea !== selectedArea) {
        setSelectedArea(foundArea);
        localStorage.setItem('lbricol_preferred_area', foundArea);
      }
    } else {
      // If no supported city is found in the current address, 
      // we reset the selected city to trigger service hiding
      if (selectedCity !== null) {
        setSelectedCity(null);
        // Optionally keep the last known area or clear it too
        // setSelectedArea(null); 
      }
    }
  };

  const handleServiceSelection = (serviceId: string, sub: any) => {
    resetOrder();
    const currentSub = sub as any;
    const serviceTemplate = SERVICES_CATALOGUE?.find(s => s.id === serviceId);
    const config = getServiceById(serviceId);
    const actualSubConfig = config?.subServices?.find(ss =>
      ss.id === currentSub.id || ss.name === currentSub.en
    );

    localStorage.setItem('last_service_category', serviceId);
    setOrderField('serviceType', serviceId);
    setOrderField('serviceName', serviceTemplate?.label || serviceId);
    setOrderField('subServiceId', currentSub.id || currentSub.en);
    setOrderField('subServiceName', t(currentSub));

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

  // Persist Addresses & Location Preference
  useEffect(() => {
    setMounted(true);
    
    // Check for tab search param
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const onboardingShown = localStorage.getItem('client_onboarding_shown');
    
    if (onboardingShown && tabParam && ['home', 'search', 'heroes', 'calendar', 'messages', 'profile'].includes(tabParam)) {
      setMobileNavTab(tabParam as any);
    } else {
      // First timers always start on home
      setMobileNavTab('home');
    }

    const saved = localStorage.getItem('lbricol_saved_addresses');

    if (saved) {
      try {
        setUserSavedAddresses(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved addresses", e);
      }
    }
    
    const prefCity = localStorage.getItem('lbricol_preferred_city');
    const prefArea = localStorage.getItem('lbricol_preferred_area');
    if (prefCity) setSelectedCity(prefCity);
    if (prefArea) setSelectedArea(prefArea);

    const lat = localStorage.getItem('lastKnownLat');
    const lng = localStorage.getItem('lastKnownLng');
    const addr = localStorage.getItem('lastKnownAddress');
    if (lat && lng) setSelectedPoint({ lat: parseFloat(lat), lng: parseFloat(lng), address: addr || '' } as any);
  }, []);

  useEffect(() => {
    if (mobileNavTab !== 'calendar') {
      setIsViewingOrderDetails(false);
    }
  }, [mobileNavTab]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('lbricol_saved_addresses', JSON.stringify(userSavedAddresses));
    }
  }, [userSavedAddresses, mounted]);

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


  const [isViewingOrderDetails, setIsViewingOrderDetails] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => {
      if (mounted && !loadingOrders && !loadingServices) {
        setShowSplash(false);
        
        const prefCity = localStorage.getItem('lbricol_preferred_city');
        if (!prefCity && !showLanguagePopup) {
          setShowLocationPicker(true);
        }
      }
    }, 2500);

    if (mounted && !loadingOrders && !loadingServices) {
      const finalTimer = setTimeout(() => setShowSplash(false), 1000);
      return () => {
        clearTimeout(minTimer);
        clearTimeout(finalTimer);
      };
    }

    return () => clearTimeout(minTimer);
  }, [mounted, loadingOrders, loadingServices, showLanguagePopup]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isCalendarExpanded && !isMobile) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isCalendarExpanded, isMobile]);

  useEffect(() => {
    const hasOrders = localStorage.getItem('lbricol_has_orders') === 'true';
    if (hasOrders) setShowFloatingCalendar(true);

    const savedOrders = localStorage.getItem('lbricol_saved_orders');
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders));
        setLoadingOrders(false);
      } catch (e) {
        console.error("Error parsing saved orders", e);
      }
    }
  }, []);



  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authIntent, setAuthIntent] = useState<'bricoler' | 'program_order' | 'login_only' | null>(null);
  const [showClientWhatsAppPopup, setShowClientWhatsAppPopup] = useState(false);

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
  const [activeBubble, setActiveBubble] = useState<{ id: string, avatar?: string, count: number, jobId: string } | null>(null);
  const [dismissedMessages, setDismissedMessages] = useState<string[]>([]);

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

  useEffect(() => {
    if (newlyProgrammedOrderId) {
      const timer = setTimeout(() => {
        setNewlyProgrammedOrderId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newlyProgrammedOrderId]);

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

    const onboardingShown = localStorage.getItem('client_onboarding_shown');
    if (!onboardingShown) {
      localStorage.setItem('client_onboarding_shown', 'true');
    }



    setMounted(true);

    if (typeof window !== 'undefined' && "permissions" in navigator) {
      navigator.permissions.query({ name: 'geolocation' as any }).then((result) => {
        if (result.state === 'denied') setGpsPermissionDenied(true);
        result.onchange = () => {
          setGpsPermissionDenied(result.state === 'denied');
        };
      });
    }
  }, []);

  useEffect(() => {
    if (!showSplash && mounted && !showClientOnboarding) {
      const savedLang = localStorage.getItem('lbricol_language');
      const savedCity = localStorage.getItem('lbricol_preferred_city');

      if (!savedLang) {
        setShowLanguagePopup(true);
      } else if (!savedCity) {
        handleFirstArrivalLocationTrigger();
      } else {
        let migratedCity = savedCity;
        if (migratedCity === 'Marrakesh') migratedCity = 'Marrakech';
        if (migratedCity && migratedCity.includes(' (')) {
          migratedCity = migratedCity.split(' (')[0];
          localStorage.setItem('lbricol_preferred_city', migratedCity);
        }
        setSelectedCity(migratedCity);
        setLocation(migratedCity);
        const savedArea = localStorage.getItem('lbricol_preferred_area');
        if (savedArea) setSelectedArea(savedArea);
        setShowCityPopup(false);

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const startBricolerIntent = params.get('start_bricoler');
          if (startBricolerIntent === 'true' && !showMobileOnboarding && !showClientOnboarding) {
            setShowMobileOnboarding(true);
            const url = new URL(window.location.href);
            url.searchParams.delete('start_bricoler');
            window.history.replaceState({}, '', url.toString());
          }
        }
      }
    }
  }, [showSplash, mounted, showClientOnboarding, showMobileOnboarding]);

  useEffect(() => {
    if (!selectedCity) {
      setAvailableServices([]);
      setAvailableSubServices([]);
      setTrendingSubServices([]);
      setPopularServiceIds([]);
      return;
    }

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
        const serviceFreq: Record<string, Set<string>> = {};
        const serviceRatings: Record<string, { total: number, count: number }> = {};

        pros.forEach(p => {
          const proRating = typeof p.rating === 'number' ? p.rating : 4.9;
          const hasRating = typeof p.rating === 'number' && p.rating > 0;
          
          if (Array.isArray(p.services)) {
            p.services.forEach((s: any) => {
              const serviceId = typeof s === 'string' ? s : (s.serviceId || s.categoryId);
              
              const normalizeSubId = (id: string) => {
                const map: Record<string, string> = {
                  'family_home': 'standard_small',
                  'hospitality': 'hospitality_turnover',
                  'car_washing': 'car_wash'
                };
                return map[id] || id;
              };

              if (serviceId) {
                if (SERVICES_HIERARCHY[serviceId]) {
                  activeIds.add(serviceId);
                  if (!serviceFreq[serviceId]) serviceFreq[serviceId] = new Set();
                  if (p.uid || p.id) serviceFreq[serviceId].add(p.uid || p.id);
                  
                  if (!serviceRatings[serviceId]) serviceRatings[serviceId] = { total: 0, count: 0 };
                  serviceRatings[serviceId].total += proRating;
                  serviceRatings[serviceId].count += 1;
                } else {
                  const resolvedSubId = normalizeSubId(serviceId);
                  const resolvedCatId = getCategoryForSubService(resolvedSubId);
                  if (resolvedCatId) {
                    activeIds.add(resolvedCatId);
                    activeSubIds.add(resolvedSubId);
                    if (!serviceFreq[resolvedCatId]) serviceFreq[resolvedCatId] = new Set();
                    if (p.uid || p.id) serviceFreq[resolvedCatId].add(p.uid || p.id);

                    if (!serviceRatings[resolvedCatId]) serviceRatings[resolvedCatId] = { total: 0, count: 0 };
                    serviceRatings[resolvedCatId].total += proRating;
                    serviceRatings[resolvedCatId].count += 1;
                  }
                }
              }

              const rawSubId = typeof s === 'object' ? (s.subServiceId || (getCategoryForSubService(serviceId) ? serviceId : null)) : null;
              if (rawSubId) {
                const subId = normalizeSubId(rawSubId);
                const softBlocklist = ['car_wash', 'car_detailing', 'car_detail'];
                
                if (!softBlocklist.includes(subId)) {
                  activeSubIds.add(subId);
                  subFreq[subId] = (subFreq[subId] || 0) + 1;
                }
              }
            });
          }
        });

        const trendingIds = Object.entries(subFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(e => e[0]);

        const serviceCountResult: Record<string, number> = {};
        const serviceRatingsResult: Record<string, number> = {};
        
        Object.keys(serviceFreq).forEach(k => {
            serviceCountResult[k] = serviceFreq[k].size;
        });
        
        Object.keys(serviceRatings).forEach(k => {
            const avg = serviceRatings[k].total / serviceRatings[k].count;
            // Add a tiny random jitter so it doesn't look like exactly 4.90 everywhere if many have default
            // But let's keep it clean: if there are no ratings, it'll be 4.9.
            serviceRatingsResult[k] = avg;
        });

        setBricolersCountMap(serviceCountResult);
        setServiceRatingsMap(serviceRatingsResult);

        setAvailableServices(Array.from(activeIds));
        setAvailableSubServices(Array.from(activeSubIds));
        setTrendingSubServices(trendingIds);
      } catch (err) {
        console.error("Error fetching active services:", err);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchActiveServices();
  }, [selectedCity, selectedArea]);

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

        const aggregated = new Map<string, number>();

        Object.entries(data)
          .filter(([k]) => k !== 'city' && k !== 'month')
          .forEach(([rawKey, value]) => {
            const count = typeof value === 'number' ? value : 0;
            if (count <= 0) return;

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

  const [profIndex, setProfIndex] = useState(0);

  const professionalTypesDomestic = [
    { en: "Home repairs", fr: "Bricolage" },
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

  const handleProfileBricolerAction = () => {
    if (isBricoler) {
      localStorage.removeItem('lbricol_force_client_mode');
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

    if (prevOfferCountRef.current !== null && currentOfferCount > prevOfferCountRef.current) {
      const allOffers: any[] = [];
      orders.forEach(j => j.offers?.forEach((o: any) => { if (o.sender !== 'client') allOffers.push({ o, j }); }));

      const latestOfferPair = allOffers.sort((a, b) => (b.o.timestamp?.seconds || 0) - (a.o.timestamp?.seconds || 0))[0];

      if (latestOfferPair) {
        const isAcceptance = Number(latestOfferPair.o.price) === Number(latestOfferPair.j.price);
        try {
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

            if (data.senderId !== currentUser.uid && !notifiedMessageIds.current.has(msgId)) {
              notifiedMessageIds.current.add(msgId);

              const job = orders.find(o => o.id === jobId);
              setIncomingMessages(prev => {
                if (prev.find(m => m.id === msgId)) return prev;
                return [...prev, { ...data, id: msgId, jobId, serviceTitle: job?.service || 'Service' }];
              });

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
            const createdAtMillis = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now());
            const isFresh = (Date.now() - createdAtMillis) < 60000;

            if (isFresh) {
              notifiedNotificationIds.current.add(id);
              const currentIds = Array.from(notifiedNotificationIds.current);
              localStorage.setItem('lbricol_notified_notif_ids', JSON.stringify(currentIds));

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

              if (data.type === 'new_message') {
                setActiveBubble({
                  id,
                  avatar: data.senderAvatar,
                  count: unreadNotifsCount + 1,
                  jobId: data.jobId
                });
              } else {
                showToast({
                  title: data.title || 'Notification',
                  description: data.body,
                  variant: data.type === 'order_confirmed' ? 'success' : 'info',
                  duration: 5000
                });
              }
            } else {
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
  const handleFirstArrivalLocationTrigger = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr,en`,
              { headers: { 'User-Agent': 'Lbricol/1.0' } }
            );
            const data = await res.json();
            const cityName = data.address?.city || data.address?.town || data.address?.village || '';
            const neighborhood = data.address?.neighbourhood || data.address?.suburb || '';
            const street = data.address?.road || '';
            const finalAddress = street ? `${street}, ${cityName}` : (cityName || 'Custom Location, Morocco');
            
            handleLocationConfirm({
              pickup: {
                lat,
                lng,
                address: finalAddress,
                city: cityName || undefined,
                area: neighborhood || undefined
              }
            });
          } catch (err) {
            console.error("Silent location detection failed:", err);
          }
        },
        () => {
        },
        { timeout: 30000, enableHighAccuracy: true }
      );
    }
  };

  const handleLocationConfirm = (result: { pickup: any; dropoff?: any; savedAddress?: SavedAddress }) => {
    const { pickup, savedAddress } = result;
    const address = savedAddress?.address || pickup.address || '';
    const lowerAddress = address.toLowerCase();

    let city = MOROCCAN_CITIES.find((c: string) => lowerAddress.includes(c.toLowerCase())) || 'Casablanca';
    
    const areaList = MOROCCAN_CITIES_AREAS[city] || [];
    let area = '';

    const sortedAreas = [...areaList].sort((a, b) => b.length - a.length);
    const matchedArea = sortedAreas.find((a: string) => lowerAddress.includes(a.toLowerCase()));

    if (matchedArea) {
      area = matchedArea;
    } else {
      for (const [c, areas] of Object.entries(MOROCCAN_CITIES_AREAS)) {
        const sorted = [...areas].sort((a, b) => b.length - a.length);
        const match = sorted.find((a: string) => lowerAddress.includes(a.toLowerCase()));
        if (match) {
          city = c;
          area = match;
          break;
        }
      }
    }

    if (!area && areaList.length > 0) {
      area = areaList[0];
    }

    setSelectedCity(city);
    setSelectedArea(area);
    setSelectedPoint(pickup);
    setLocation(city);
    localStorage.setItem('lbricol_preferred_city', city);
    localStorage.setItem('lbricol_preferred_area', area);
    localStorage.setItem('lastKnownLat', pickup.lat.toString());
    localStorage.setItem('lastKnownLng', pickup.lng.toString());
    localStorage.setItem('lastKnownAddress', pickup.address);
    setShowLocationPicker(false);
    setShowCityPopup(false);
    router.push('/');
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
    let unsubscribeJobs: (() => void) | null = null;
    let unsubscribeUserData: (() => void) | null = null;
    let unsubscribeBricolerStatus: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        if (unsubscribeJobs) { unsubscribeJobs(); unsubscribeJobs = null; }
        if (unsubscribeUserData) { unsubscribeUserData(); unsubscribeUserData = null; }
        if (unsubscribeBricolerStatus) { unsubscribeBricolerStatus(); unsubscribeBricolerStatus = null; }

        setCurrentUser(user);
        console.log("🔐 Auth state changed:", user ? `Logged in as ${user.email}` : "Not logged in");

        if (user) {
          const userRef = doc(db, 'users', user.uid);
          let hasAdminRedirected = false;
          unsubscribeUserData = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserData(data);
              const isAdminUser = data.role === 'admin';
              setIsAdmin(isAdminUser);
              if (!hasAdminRedirected && isAdminUser && typeof window !== 'undefined' && window.location.pathname === '/') {
                const forceClient = localStorage.getItem('lbricol_force_client_mode') === 'true';
                hasAdminRedirected = true;
                if (!forceClient) {
                  router.push('/admin');
                }
              }
            } else {
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

          const bricolerRef = doc(db, 'bricolers', user.uid);
          let hasRedirectedScroll = false;
          unsubscribeBricolerStatus = onSnapshot(bricolerRef, (snap) => {
            const isBricolerUser = snap.exists() && snap.data()?.isBricoler === true;
            setIsBricoler(isBricolerUser);

            if (!hasRedirectedScroll && typeof window !== 'undefined' && window.location.pathname === '/') {
              const forceClient = localStorage.getItem('lbricol_force_client_mode') === 'true';
              hasRedirectedScroll = true;

              if (isBricolerUser && !forceClient) {
                router.push('/provider');
                return;
              }
            }
          });

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

            const now = new Date();
            loadedJobs.forEach(async (job) => {
              if (job.status === 'cancelled') return;

              if (job.frequency && job.frequency !== 'once' && job.nextRunDate) {
                const nextDate = new Date(job.nextRunDate);
                if (now >= nextDate) {
                  const advanceDate = new Date(nextDate);
                  if (job.frequency === 'daily') advanceDate.setDate(advanceDate.getDate() + 1);
                  else if (job.frequency === 'weekly') advanceDate.setDate(advanceDate.getDate() + 7);
                  else if (job.frequency === 'biweekly') advanceDate.setDate(advanceDate.getDate() + 14);
                  else if (job.frequency === 'monthly') advanceDate.setMonth(advanceDate.getMonth() + 1);

                  try {
                    await updateDoc(doc(db, 'jobs', job.id as string), {
                      frequency: 'once',
                      nextRunDate: null
                    });

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
                      nextRunDate: advanceDate.toISOString(),
                      expectedEndTime: (() => {
                        try {
                          const [h, m] = (job.time || "10:00").split(':').map(Number);
                          const start = new Date(nextDate);
                          start.setHours(h, m, 0, 0);
                          const dur = (job as any).estimatedDuration || 1;
                          return new Date(start.getTime() + (dur * 60 * 60 * 1000) + (30 * 60 * 1000));
                        } catch (e) { return null; }
                      })()
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

            const unratedDoneJob = loadedJobs.find(j => 
              (j.status === 'done' || j.status === 'delivered') && 
              !j.rated && 
              !sessionDismissedRatings.includes(j.id as string)
            );
            if (unratedDoneJob) {
              setJobToRate(unratedDoneJob);
            }
          }, (err) => {
            if (err.code === 'permission-denied') {
              console.warn("⚠️ Firestore Permission Denied");
            } else {
              console.error("Error fetching jobs real-time:", err);
            }
            setLoadingOrders(false);
          });
        } else {
          setUserData(null);
          setIsBricoler(false);
          setOrders([]);
          setLoadingOrders(false);
        }
      }
    );


    const timer = setTimeout(() => {
      if (auth.currentUser) {
        requestNotificationPermission();
      }
    }, 5000);

    return () => {
      unsubscribeAuth();
      clearTimeout(timer);
      if (unsubscribeJobs) unsubscribeJobs();
      if (unsubscribeUserData) unsubscribeUserData();
      if (unsubscribeBricolerStatus) unsubscribeBricolerStatus();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setupListener = async () => {
      if (!isMounted) return;
      const payload: any = await onMessageListener();
      if (payload && isMounted) {
        showToast({
          title: payload.notification?.title || 'Notification',
          description: payload.notification?.body,
          variant: 'info',
          duration: 7000
        });
        setupListener();
      }
    };

    setupListener();
    return () => { isMounted = false; };
  }, [showToast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target as Node)) {
        setActiveSearchSection(null);
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

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const checkStatusTransitions = async () => {
      const now = new Date();

      for (const order of orders) {
        if (!auth.currentUser || !order.id || !order.date) continue;

          if (['cancelled', 'done', 'delivered', 'programmed', 'broadcast', 'accepted'].includes(order.status || '')) continue;

          try {
            const datePart = order.date.includes(' at ') ? order.date.split(' at ')[0] : order.date;
            const timeStr = order.time?.split('-')[0].trim() || "09:00";

            let scheduledStart: Date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
              const [y, m, d] = datePart.split('-').map(Number);
              scheduledStart = new Date(y, m - 1, d);
            } else {
              scheduledStart = new Date(datePart);
            }

            const [hours, mins] = timeStr.split(':').map(Number);
            if (!isNaN(hours)) scheduledStart.setHours(hours, mins || 0, 0, 0);

            if (isNaN(scheduledStart.getTime())) continue;

            let scheduledEnd: Date;
            if (order.expectedEndTime) {
                scheduledEnd = order.expectedEndTime.toDate ? order.expectedEndTime.toDate() : new Date(order.expectedEndTime);
            } else {
                let durationHours = 2;
                const size = (order.taskSize || 'medium').toLowerCase();
                const serviceStr = (order.service || '').toLowerCase();

                if (size === 'small') durationHours = 1;
                else if (size === 'medium') durationHours = 2;
                else if (size === 'large') {
                    if (serviceStr.includes('painting')) durationHours = 8;
                    else if (serviceStr.includes('moving')) durationHours = 6;
                    else if (serviceStr.includes('cleaning')) durationHours = 5;
                    else if (serviceStr.includes('gardening')) durationHours = 5;
                    else if (serviceStr.includes('electricity') || serviceStr.includes('plumbing')) durationHours = 5;
                    else durationHours = 4;
                }
                scheduledEnd = new Date(scheduledStart.getTime() + durationHours * 60 * 60 * 1000);
            }

            let newStatus: string | null = null;
            if (now >= scheduledEnd) {
              newStatus = 'done';
            } else if (now >= scheduledStart) {
              if (['confirmed', 'accepted', 'programmed'].includes(order.status || '')) {
                newStatus = 'pending';
              }
            }

            if (newStatus && newStatus !== order.status) {
              console.log(`[AutoUpdate] Transitioning order ${order.id} from ${order.status} to ${newStatus}`);
              await updateDoc(doc(db, 'jobs', order.id), { status: newStatus as any });
            }
        } catch (e) {
          console.error("Error in auto status update for order", order.id, e);
        }
      }
    };

    const interval = setInterval(checkStatusTransitions, 120000);
    checkStatusTransitions();

    return () => clearInterval(interval);
  }, [orders]);


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

  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [bricolersCount, setBricolersCount] = useState(1);
  const [orderComment, setOrderComment] = useState("");
  const [orderPictures, setOrderPictures] = useState<string[]>([]);

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
      if (!rangeSelection.start || (rangeSelection.start && rangeSelection.end)) {
        setRangeSelection({ start: selectedDate, end: null });
        setSelectedDates([dateString]);
        setActiveSchedulingDate(dateString);
      } else {
        let newStart = rangeSelection.start;
        let newEnd = selectedDate;

        if (newEnd < newStart) {
          [newStart, newEnd] = [newEnd, newStart];
        }

        setRangeSelection({ start: newStart, end: newEnd });
        setActiveSchedulingDate(dateString);

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
      handleFirstArrivalLocationTrigger();
    } else {
      setActiveSearchSection('what');
    }
  };

  useEffect(() => {
    if (!service || !selectedCity) {
      setUnavailableDates([]);
      setDateUnavailableTimes({});
      return;
    }

    const checkAvailability = async () => {
      try {
        const providersQuery = query(
          collection(db, 'bricolers'),
          where('city', '==', selectedCity)
        );
        const providersSnap = await getDocs(providersQuery);
        const eligibleProviders = providersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })).filter(data => {
          if (!data.services || !Array.isArray(data.services)) return false;

          return data.services.some((s: any) => {
            const currentCatId = typeof s === 'string' ? s : (s.categoryId || s.serviceId);
            if (!currentCatId || typeof currentCatId !== 'string') return false;

            const catMatch = currentCatId.toLowerCase() === service.toLowerCase();
            if (!catMatch) return false;

            if (subService) {
              if (typeof s === 'string') return true;

              const currentSubId = s.subServiceId || (s.subServices?.includes(subService) ? subService : null);
              if (!currentSubId) return false;

              return currentSubId.toLowerCase() === subService.toLowerCase() || (Array.isArray(s.subServices) && s.subServices.includes(subService));
            }

            return true;
          });
        });

        if (eligibleProviders.length === 0) {
          setUnavailableDates([]);
          return;
        }

        const dateRangeQuery = query(
          collection(db, 'jobs'),
          where('city', '==', selectedCity)
        );
        const jobsSnap = await getDocs(dateRangeQuery);
        const validStatuses = ['new', 'negotiating', 'pending', 'waiting', 'accepted', 'confirmed', 'in_progress'];
        const list = jobsSnap.docs
          .map(d => d.data())
          .filter(d => validStatuses.includes(d.status));

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
        Object.entries(usage).forEach(([d_str, providerMap]) => {
          const allBusy = eligibleProviders.every(p => (providerMap[p.id] || 0) >= 2);
          if (allBusy) newUnavailableDates.push(d_str);
        });
        setUnavailableDates(newUnavailableDates);

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
        resolve(canvas.toDataURL('image/jpeg', 0.4));
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

    let effectiveWhatsApp = whatsappOverride || userData?.whatsappNumber;

    try {
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

      const missingTimeDate = datesToProcess.find(d => !selectedTimes[d]);
      if (missingTimeDate) {
        showToast({ variant: 'error', title: t({ en: `Please select a time for ${missingTimeDate}.`, fr: `Veuillez sélectionner une heure pour ${missingTimeDate}.` }) });
        setActiveSearchSection('when');
        setIsProgramming(false);
        return;
      }

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

      if (!effectiveUser) {
        console.log("[handleProgramOrder] No user, showing auth");
        setAuthIntent('program_order');
        setShowAuthPopup(true);
        setIsProgramming(false);
        return;
      }

      if (!effectiveWhatsApp) {
        console.log("[handleProgramOrder] No WhatsApp");
        setShowClientWhatsAppPopup(true);
        setIsProgramming(false);
        return;
      }

      if (effectiveWhatsApp && effectiveUser) {
        await setDoc(doc(db, 'users', effectiveUser.uid), { whatsappNumber: effectiveWhatsApp }, { merge: true });
        await setDoc(doc(db, 'clients', effectiveUser.uid), { whatsappNumber: effectiveWhatsApp }, { merge: true });
      }

      let newOrders: OrderDetails[] = [];

      let finalPrice = parseFloat(price) || 0;
      try {
        const userRef = doc(db, 'users', effectiveUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().referralDiscountAvailable) {
          const disc = userSnap.data().referralDiscountAvailable;
          finalPrice = Math.max(0, finalPrice * 0.85);
          await updateDoc(userRef, { referralDiscountAvailable: increment(-15) });
          await updateDoc(userRef, { referralRewardIssued: true });

          const referrerId = userSnap.data().referredBy;
          if (referrerId) {
            const referrerRef = doc(db, 'users', referrerId);
            const referrerSnap = await getDoc(referrerRef);
            if (referrerSnap.exists()) {
              const rData = referrerSnap.data();
              if (rData.isProvider) {
                await updateDoc(referrerRef, { bricolerReferralBalance: increment(15) });
              } else {
                await updateDoc(referrerRef, { referralBalance: increment(15) });
              }
            }
          }
          await updateDoc(userRef, { referralRewardIssued: true });

          showToast({
            variant: 'success',
            title: t({ en: "Referral applied!", fr: "Parrainage appliqué !" }),
            description: t({ en: "15% discount applied to your order.", fr: "Réduction de 15% appliquée à votre commande." })
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

      console.log("[handleProgramOrder] Saving to 'jobs' collection...", newOrders.length, "orders");

      const savedOrders: OrderDetails[] = [];

      for (const order of newOrders) {
        const distribution = await distributeJob({
          service: service as string,
          subService: subService || null,
          city: selectedCity as string,
          date: order.date,
          time: order.time as string,
          clientId: effectiveUser.uid
        });

        let expectedEndTime = null;
        try {
          const [h, m] = (order.time || "10:00").split(':').map(Number);
          const startDate = new Date(order.date);
          startDate.setHours(h, m, 0, 0);
          
          const serviceConfig = getServiceById(service as string);
          const subConfig = (serviceConfig as any)?.subServices?.find((s: any) => s.id === subService);
          const durationHr = subConfig?.estimatedDurationHr || (serviceConfig as any)?.estimatedDurationHr || 2;
          
          expectedEndTime = new Date(startDate.getTime() + (durationHr * 60 * 60 * 1000) + (30 * 60 * 1000));
        } catch (e) {
          console.error("Error calculating expectedEndTime in handleProgramOrder", e);
        }

        const jobData = {
          clientId: effectiveUser.uid,
          clientName: effectiveUser.displayName || "Anonymous",
          clientAvatar: effectiveUser.photoURL || "",
          service: service as string,
          subService: subService || null,
          subServiceDisplayName: order.subServiceDisplayName || null,
          date: order.date,
          time: order.time,
          expectedEndTime: expectedEndTime || null,
          status: 'new',
          offers: [],
          offeredTo: distribution.providerIds,
          city: selectedCity,
          createdAt: serverTimestamp(),
          title: order.service,
          description: order.comment || "No detailed description provided.",
          rating: 5,
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
                return null;
              }
            }
            return img;
          });
          const resolvedUrls = await Promise.all(uploadPromises);
          jobData.images = resolvedUrls.filter(Boolean) as string[];
        }

        const docRef = await addDoc(collection(db, 'jobs'), jobData);
        console.log("Job saved with ID: ", docRef.id);

        await setDoc(doc(db, 'clients', effectiveUser.uid), {
          uid: effectiveUser.uid,
          name: effectiveUser.displayName,
          email: effectiveUser.email,
          whatsappNumber: effectiveWhatsApp,
          userType: 'client',
          createdAt: serverTimestamp()
        }, { merge: true });

        savedOrders.push({ ...order, id: docRef.id });

        await addDoc(collection(db, 'activity'), {
          type: 'new_order',
          clientId: effectiveUser.uid,
          service,
          city: selectedCity,
          jobId: docRef.id,
          timestamp: serverTimestamp()
        });

        try {
          const now = new Date();
          const monthKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
          const statsDocId = `${selectedCity}_${monthKey}`;
          const statsRef = doc(db, 'city_monthly_stats', statsDocId);

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
        }
      }

      console.log("[handleProgramOrder] Success:", savedOrders.length);

      import('canvas-confetti').then((m) => m.default({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#000000', '#FFD700', '#FFFFFF']
      }));

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

      if (isMobile) {
        setMobileNavTab('calendar');
      } else {
        setShowFloatingCalendar(true);
        setIsCalendarExpanded(true);
      }

      if (savedOrders.length > 0) {
        setTimeout(() => {
          setSelectedOrderId(savedOrders[0].id || null);
          setNewlyProgrammedOrderId(savedOrders[0].id || null);
        }, 400);
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
    setShowClientWhatsAppPopup(false);

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
      await setDoc(doc(db, 'clients', currentUser.uid), { whatsappNumber }, { merge: true });
      await setDoc(doc(db, 'users', currentUser.uid), { whatsappNumber }, { merge: true });
      setUserData((prev: any) => ({ ...prev, whatsappNumber }));

      let referralDiscountApplied = 0;

      if (referralCode && referralCode.trim()) {
        const upperCode = referralCode.trim().toUpperCase();
        try {
          const currentUserRef = doc(db, 'users', currentUser.uid);
          const currentUserSnap = await getDoc(currentUserRef);
          const userData = currentUserSnap.data() || {};

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

              referralDiscountApplied = 50;
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
      const sanitizedOffer = JSON.parse(JSON.stringify(offer));

      await updateDoc(jobRef, {
        status: 'confirmed',
        bricolerId: offer.bricolerId,
        bricolerName: offer.bricolerName,
        bricolerAvatar: offer.avatar || null,
        finalPrice: offer.price,
        acceptedOffer: sanitizedOffer
      });

      if (currentUser) {
        const clientRef = doc(db, 'clients', currentUser.uid);
        await updateDoc(clientRef, {
          previousProviders: arrayUnion(offer.bricolerId)
        });

        await addDoc(collection(db, 'bricoler_notifications'), {
          bricolerId: offer.bricolerId,
          type: 'offer_accepted',
          jobId,
          serviceName: jobTitle || 'Service',
          timestamp: serverTimestamp(),
          read: false
        });
      }

      import('canvas-confetti').then((m) => m.default({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      }));

      setSelectedOrderId(jobId);
      setAutoChatOrderId(jobId);
      if (isMobile) {
        setMobileNavTab('calendar');
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

      await updateDoc(jobRef, {
        offeredTo: arrayRemove(offer.bricolerId),
        declinedBricolers: arrayUnion(offer.bricolerId)
      });

      await addDoc(collection(db, 'bricoler_notifications'), {
        bricolerId: offer.bricolerId,
        type: 'offer_declined',
        jobId,
        serviceName: jobTitle || 'Service',
        timestamp: serverTimestamp(),
        read: false
      });

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
        bricolerId: activeCounterOffer.bricolerId,
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




  const [isLoggingIn, setIsLoggingIn] = useState(false);


  const handleGoogleLogin = async (providedResult?: { user: FirebaseUser, userData?: any }) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    console.log("[handleGoogleLogin] Starting authentication flow", providedResult ? "with provided result" : "from scratch");

    try {
      let user: FirebaseUser;
      let existingData: any = {};

      if (providedResult) {
        user = providedResult.user;
        existingData = providedResult.userData || {};
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      }

      const userRef = doc(db, 'users', user.uid);
      if (!providedResult || !providedResult.userData) {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          existingData = userSnap.data();
          setUserData(existingData);
        }
      }

      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: serverTimestamp(),
        ...existingData
      }, { merge: true });

      setCurrentUser(user);
      setShowAuthPopup(false);

      console.log("[handleGoogleLogin] Success for user:", user.uid);
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
        console.log("Popup request was cancelled by a new request.");
      } else if (error.code === 'auth/popup-closed-by-user') {
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

  const isFullscreenMobileTab = isMobile && ['home', 'profile', 'share', 'promocodes', 'calendar', 'messages', 'heroes'].includes(mobileNavTab);

  const isMaintenanceMode = false;
  if (isMaintenanceMode) {
    return <ComingSoon />;
  }

  return (
    <div style={{ backgroundColor: c.bg, color: c.text, minHeight: '100vh', scrollBehavior: 'smooth' }} className="font-sans">
      <AnimatePresence>
        {(showSplash || isProgramming) && <SplashScreen key="splash" />}
      </AnimatePresence>



      <AnimatePresence>
        {showLocationPicker && (
          <LocationPicker
            mode="single"
            serviceType="general"
            onConfirm={handleLocationConfirm}
            onClose={() => setShowLocationPicker(false)}
            savedAddresses={userSavedAddresses}
            autoLocate={autoLocateOnPickerOpen}
            onSaveAddress={(addr) => {
              setUserSavedAddresses(prev => {
                const exists = prev.find(a => a.id === addr.id);
                if (exists) return prev.map(a => a.id === addr.id ? addr : a);
                return [addr, ...prev];
              });
            }}
            onDeleteAddress={(id) => {
              setUserSavedAddresses(prev => prev.filter(a => a.id !== id));
            }}
          />
        )}
      </AnimatePresence>


      <RatingPopup
        isOpen={!!jobToRate}
        onClose={() => {
          if (jobToRate?.id) {
            setSessionDismissedRatings(prev => [...prev, jobToRate.id as string]);
          }
          setJobToRate(null);
        }}
        jobId={jobToRate?.id || ''}
        bricolerId={jobToRate?.bricolerId || ''}
        bricolerName={jobToRate?.bricolerName || 'Bricoler'}
        bricolerAvatar={jobToRate?.bricolerAvatar || undefined}
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
        paddingBottom: isMobile ? (['home', 'calendar', 'messages', 'share', 'promocodes', 'heroes'].includes(mobileNavTab) ? '0' : '80px') : '0',
        overflow: isMobile && (mobileNavTab === 'calendar' || mobileNavTab === 'messages' || mobileNavTab === 'share' || mobileNavTab === 'promocodes' || mobileNavTab === 'search') ? 'hidden' : 'visible',
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
                  onViewingOrderDetails={setIsViewingOrderDetails}
                  onViewMessages={(jobId: string) => {
                    setMobileNavTab('messages');
                    setSelectedOrderId(jobId);
                  }}
                  initialShowHistory={showHistoryInOrders}
                   onResumeDraft={(draft) => {
                    const normalizedDraft = {
                      serviceType: draft.service || '',
                      serviceName: draft.serviceName || draft.service || '',
                      subServiceId: draft.subService || '',
                      subServiceName: draft.subServiceName || '',
                      location: draft.location || null,
                      discoveryLocation: draft.discoveryLocation || null,
                      providerId: draft.providerId || null,
                      providerName: draft.providerName || null,
                      providerRate: draft.providerRate || null,
                      scheduledDate: draft.scheduledDate || null,
                      scheduledTime: draft.scheduledTime || null,
                      serviceIcon: draft.serviceIcon || null
                    };
                    setOrderState(normalizedDraft);
                    const targetStep = draft.providerId ? '/order/step3' : '/order/step2';
                    router.push(targetStep);
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

            {mobileNavTab === 'reviews' && isAdminMode && (
              <AdminReviewsView />
            )}

            {mobileNavTab === 'profile' && (
              <ProfileView
                onToggleOnboarding={setIsProfileOnboardingOpen}
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
                onLogin={() => { setAuthIntent('login_only'); setShowAuthPopup(true); }}
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
                onLogin={() => { setAuthIntent('login_only'); setShowAuthPopup(true); }}
              />
            )}

            {mobileNavTab === 'promocodes' && (
              <PromocodesView
                currentUser={currentUser}
                onBack={() => setMobileNavTab('profile')}
              />
            )}

            {mobileNavTab === 'search' && (
              <SearchPopup
                isOpen={true}
                onClose={() => setMobileNavTab('home')}
                onSelectSubService={(serviceId, sub) => handleServiceSelection(serviceId, sub)}
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
        {(!isMobile || mobileNavTab === 'home') && !showSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col"
          >
            {/* On mobile: Glovo-style flash home; on desktop: full hero */}
            {isMobile && mobileNavTab === 'home' && !isAdminMode && !isSearchOpen && (
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
            {isAdminMode && !isSearchOpen && (
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
                // ... same mobile props as before
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                userName={currentUser?.displayName || undefined}
                selectedCity={selectedCity}
                selectedArea={selectedArea}
                onAddressUpdate={handleAddressUpdate}
                recentOrders={orders.filter(o => o.status !== 'cancelled')}
                availableServiceIds={availableServices}

                availableSubServiceIds={availableSubServices}
                trendingSubServiceIds={trendingSubServices}
                popularServiceIds={popularServiceIds}
                gpsPermissionDenied={gpsPermissionDenied}
                bricolersCountMap={bricolersCountMap}
                serviceRatingsMap={serviceRatingsMap}
                onSelectService={handleServiceSelection}
                onChangeLocation={() => {
                  setAutoLocateOnPickerOpen(true);
                  setShowLocationPicker(true);
                }}
                onNavigateToShare={() => setMobileNavTab('share')}
                showOnboarding={showClientOnboarding}
                onOnboardingComplete={() => {
                  localStorage.setItem('client_onboarding_shown', 'true');
                  setShowClientOnboarding(false);
                  
                  // Immediately ask for location after onboarding
                  if (!selectedCity) {
                    handleFirstArrivalLocationTrigger();
                  }
                }}
                onBecomeBricoler={() => {
                  if (currentUser) {
                    if (isBricoler) {
                      localStorage.removeItem('lbricol_force_client_mode');
                      window.location.href = '/provider';
                    } else {
                      setShowMobileOnboarding(true);
                    }
                  } else {
                    setAuthIntent('bricoler');
                    setShowAuthPopup(true);
                  }
                }}
                isBricoler={isBricoler}
                initialLocation={selectedPoint as any}
              />

            ) : (

              <>
                <ServicesHeroSection 
                  availableServiceIds={availableServices}
                  onSelectService={(serviceId) => {
                    setSelectedDesktopServiceId(serviceId);
                    setShowDesktopSubServicePopup(true);
                  }}
                />

                <DesktopOrderModal
                  isOpen={showDesktopSubServicePopup}
                  onClose={() => setShowDesktopSubServicePopup(false)}
                  serviceId={selectedDesktopServiceId}
                  availableSubServices={availableSubServices}
                />

                <MillionsImpactSection />
                <OpportunitySection />
                <MoroccoServiceMap />

                {false && (
                  <>
                {/* Hero Section */}
                <DesktopHeroScroll
                  onOrderClick={(serviceId) => {
                    setService(serviceId || "");
                    setSubService(null);
                    alert("Order flow is under maintenance. Please try again later.");
                  }}
                  onBecomeBricolerClick={() => {
                    if (currentUser && isBricoler) {
                      localStorage.removeItem('lbricol_force_client_mode');
                      window.location.href = '/provider';
                    } else if (currentUser) {
                      setShowMobileOnboarding(true);
                    } else {
                      setAuthIntent('bricoler');
                      setShowAuthPopup(true);
                    }
                  }}
                />

                {/* Compact Map Section (Desktop) */}
                <div className="max-w-[1270px] mx-auto px-6 pb-12 h-[300px]">
                   <CompactHomeMap 
                      city={selectedCity}
                      area={selectedArea}
                      onAddressUpdate={handleAddressUpdate}
                      onInteract={() => {
                        setAutoLocateOnPickerOpen(true);
                        setShowLocationPicker(true);
                      }}
                   />
                </div>

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
                            {/* Chat Icon Removed - Using WhatsApp only */}

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

                          {/* Messages Modal Removed - Using WhatsApp only */}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                  </>
                )}





                <div className="md:hidden"><Footer /></div>




              </>
            )}

          </motion.div>
        )}

        <AuthPopup
          isOpen={showAuthPopup}
          onClose={() => {
            setShowAuthPopup(false);
            setAuthIntent(null);
          }}
          onSuccess={async (user) => {
            const result = await handleGoogleLogin(user ? { user } : undefined);
            if (result && result.user) {
              setShowAuthPopup(false);
              // Small timeout to allow popups to close
              setTimeout(() => {
                if (authIntent === 'login_only') {
                  setAuthIntent(null);
                  return;
                }
 
                if (authIntent === 'bricoler') {
                  setAuthIntent(null);
                  setShowMobileOnboarding(true);
                  return;
                }
 
                 if (authIntent === 'program_order' || !authIntent) {
                  handleProgramOrder(result.user, result.userData?.whatsappNumber);
                  setAuthIntent(null);
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
                                  {offer.jobsCount > 0 && <div style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: '#FFCC02', color: '#000', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '2px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', border: '1.5px solid #FFF' }}><Star size={9} fill="#000" strokeWidth={0} /><span>{offer.rating ? Number(offer.rating).toFixed(1) : '5.0'}</span></div>}
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

        {/* City selection/Language popups moved outside main */}
        <CitySelectionPopup
          isOpen={showCityPopup}
          onClose={() => setShowCityPopup(false)}
          onSelectCity={handleCitySelect}
        />

        <LanguagePreferencePopup
          isOpen={showLanguagePopup}
          onClose={() => {
            setShowLanguagePopup(false);
            const onboardingShown = localStorage.getItem('client_onboarding_shown');
            if (onboardingShown) {
              const prefCity = localStorage.getItem('lbricol_preferred_city');
              if (!prefCity && !selectedCity) {
                handleFirstArrivalLocationTrigger();
              }
            } else {
              localStorage.setItem('client_onboarding_shown', 'true');
              // setShowClientOnboarding(true);
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
            window.location.href = '/provider';
          }}
        />
      </main>

      {/* Mobile Bottom Navigation - OUTSIDE main to avoid overflow/stacking issues */}
      {isMobile && !showSplash && !showAuthPopup && !isProgramming && !showClientOnboarding && !showMobileOnboarding && !showLanguagePopup && !isViewingOrderDetails && !showMessagesModal && !showLocationPicker && !isProfileOnboardingOpen && ['home', 'calendar', 'orders', 'profile', 'performance', 'services', 'reviews', 'search'].includes(mobileNavTab) && <MobileBottomNav
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
      {/* Floating Messenger Bubble */}
      {activeBubble && (
        <FloatingMessengerBubble
          avatar={activeBubble.avatar}
          count={unreadNotifsCount || 1}
          jobId={activeBubble.jobId}
          onOpen={(jobId) => {
            setMessagesModalJobId(jobId);
            setShowMessagesModal(true);
            setActiveBubble(null);
          }}
          onDismiss={() => setActiveBubble(null)}
        />
      )}
    </div>
  );
}

