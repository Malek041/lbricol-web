'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { calculateDistance, getRoadDistance } from '@/lib/calculateDistance';
import { matchScore } from '@/lib/matchBricolers';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { X, Star, Clock, MapPin, CheckCircle2, ChevronLeft } from 'lucide-react';
import SplashScreen from '@/components/layout/SplashScreen';
import { CAR_BRANDS } from '@/config/cars_config';
import { CarRentalProfileModal } from './CarRentalProfileModal';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });

// ── Mock providers for development (used when DB has no providers with GPS) ──
const DEFAULT_AVAILABILITY = {
  'Sun': [{ from: '10:00', to: '16:00' }],
};

const SERVICES_REQUIRING_SETUP = [
  'cleaning', 'home_repairs', 'furniture_assembly', 'moving', 'mounting',
  'plumbing', 'electricity', 'painting', 'appliance_installation',
  'glass_cleaning', 'gardening', 'babysitting', 'pool_cleaning',
  'pets_care', 'elderly_care', 'cooking'
];

const MOCK_PROVIDERS = [
  {
    id: 'mock1',
    name: 'Mery Majjoud',
    avatarUrl: null,
    minRate: 80,
    rating: 0.0,
    completedJobs: 20,
    bio: 'أتعامل مع الأطفال بلطف وصبر، وأهتم بسلامتهم ونظافتهم وأوفر لهم جواً مريحاً وآمناً.',
    isNew: true,
    availableToday: true,
    service_radius_km: 15,
    availability: DEFAULT_AVAILABILITY
  },
  {
    id: 'mock2',
    name: 'Khadija Dol',
    avatarUrl: null,
    minRate: 85,
    rating: 4.8,
    completedJobs: 12,
    bio: 'مرحباً، أنا خديجة، لدي خبرة 5 سنوات في رعاية الأطفال والأنشطة التعليمية.',
    isNew: false,
    availableToday: true,
    base_lat: 31.511,
    base_lng: -9.762,
    service_radius_km: 15,
    availability: DEFAULT_AVAILABILITY
  },
  {
    id: 'mock3',
    name: 'Fatoma Ajroud',
    avatarUrl: null,
    minRate: 90,
    rating: 5.0,
    completedJobs: 24,
    bio: 'أقدم خدمات رعاية الأطفال باحترافية عالية مع التركيز على الترفيه والتعليم.',
    isNew: false,
    availableToday: false,
    base_lat: 31.508,
    base_lng: -9.755,
    service_radius_km: 15,
    availability: DEFAULT_AVAILABILITY
  },
];

function Step2Content() {
  const router = useRouter();
  const { order, setOrderField } = useOrder();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSplashing, setIsSplashing] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  const clientLat = order.location?.lat || 31.5085;
  const clientLng = order.location?.lng || -9.7595;
  const serviceType = order.serviceType || '';

  // ── Fetch providers ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, 'bricolers'),
          where('isActive', '==', true),
          limit(30)
        ));

        const all = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            // Normalize job count and rating fields for UI
            taskCount: data.completedJobs || data.taskCount || 0,
            rating: data.rating || 0,
            numReviews: data.numReviews || 0
          };
        }) as any[];

        // Filter: must offer the selected service category and potentially sub-service
        const filtered = all.filter(b => {
          if (!Array.isArray(b.services)) return false;

          return b.services.some((s: any) => {
            const catMatch = s.categoryId === serviceType || s.serviceId === serviceType;
            if (!catMatch) return false;

            // If a specific sub-service is selected, ensure the Bricoler offers it
            if (order.subServiceId) {
              return s.subServiceId === order.subServiceId ||
                s.subServiceName === order.subServiceName ||
                s.id === order.subServiceId;
            }
            return true;
          });
        });

        // Filter: must have GPS and client must be within their radius
        const inRange = filtered.filter(b => {
          if (!b.base_lat || !b.base_lng) return true; // include if no GPS yet for MVP
          const dist = calculateDistance(clientLat, clientLng, b.base_lat, b.base_lng);
          return dist <= (b.service_radius_km || 15);
        });

        const sorted = inRange.sort((a, b) => {
          const scoreA = matchScore(a, clientLat, clientLng, serviceType);
          const scoreB = matchScore(b, clientLat, clientLng, serviceType);
          return scoreB - scoreA;
        });

        const finalProviders = sorted.length > 0 ? sorted : MOCK_PROVIDERS;
        setProviders(finalProviders);
        if (finalProviders.length > 0) setFocusedId(finalProviders[0].id);

      } catch (e) {
        console.error('Failed to load providers:', e);
        setProviders(MOCK_PROVIDERS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientLat, clientLng, serviceType]);

  const saveDraftAndExit = async () => {
    const user = auth.currentUser;
    const draftData = {
      ...order,
      clientId: user?.uid || null,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      step: 2,
    };

    const cleanObject = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(cleanObject);
      if (obj instanceof Date) return obj;

      // Preserve Firestore FieldValues/Sentinels and other complex instances
      if (obj.constructor && obj.constructor.name !== 'Object') return obj;

      const clean: any = {};
      Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val === undefined) return;
        clean[key] = cleanObject(val);
      });
      return clean;
    };

    if (user) {
      try {
        await addDoc(collection(db, 'jobs'), {
          ...cleanObject(draftData),
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Error saving draft to DB:", e);
      }
    } else {
      const existing = JSON.parse(localStorage.getItem('lbricol_order_drafts') || '[]');
      const draftWithId = { ...draftData, id: `draft_${Date.now()}` };
      existing.push(draftWithId);
      localStorage.setItem('lbricol_order_drafts', JSON.stringify(existing));
    }
    router.push('/?tab=calendar');
  };

  // ── Scroll Sync ──────────────────────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth * 0.85; // matching .provider-card width
    const index = Math.round(scrollLeft / cardWidth);
    if (providers[index] && focusedId !== providers[index].id) {
      setFocusedId(providers[index].id);
    }
  };

  const handleProviderClick = (id: string) => {
    setFocusedId(id);
    const index = providers.findIndex(p => p.id === id);
    if (index !== -1 && cardsRef.current) {
      const container = cardsRef.current;
      const cardWidth = container.offsetWidth * 0.85; // match .provider-card width in CSS
      container.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  // ── Provider pin data for MapView ────────────────────────────────────
  const providerPins = providers.map(p => ({
    id: p.id,
    lat: p.base_lat || clientLat + (Math.random() - 0.5) * 0.015,
    lng: p.base_lng || clientLng + (Math.random() - 0.5) * 0.015,
    rate: p.minRate || 80,
    rating: p.rating || 0.0,
    taskCount: p.taskCount || 0,
    avatarUrl: p.avatarUrl || p.avatar || p.photoURL,
    isSelected: p.id === focusedId,
  }));

  const [viewedBricoler, setViewedBricoler] = useState<any>(null);

  const calculateRate = (provider: any) => {
    const isCarRental = order.serviceType === 'car_rental';
    const cars = provider.carRentalDetails?.cars || [];
    if (isCarRental && cars.length > 0) {
      return Math.min(...cars.map((c: any) => Number(c.pricePerDay || c.price || 9999)));
    }

    const services = Array.isArray(provider.services) ? provider.services : [];
    
    // 1. Try to find specific subservice rate
    if (order.subServiceId) {
      const subSvcInfo = services.find((s: any) => s.subServiceId === order.subServiceId || s.id === order.subServiceId);
      if (subSvcInfo) return Number(subSvcInfo.hourlyRate || subSvcInfo.price || provider.minRate || 80);
    }

    // 2. Fallback to category rate
    const catInfo = services.find((s: any) => s.categoryId === order.serviceType || s.id === order.serviceType);
    if (catInfo) return Number(catInfo.hourlyRate || catInfo.price || provider.minRate || 80);

    return Number(provider.minRate || 80);
  };

  const handleSelect = (provider: any) => {
    setFocusedId(provider.id);
    const rate = calculateRate(provider);

    // Save provider info to order context for Checkout
    setOrderField('providerId', provider.id);
    setOrderField('providerName', provider.name);
    setOrderField('providerAvatar', provider.avatarUrl || provider.avatar || provider.photoURL || null);
    setOrderField('providerRate', rate);
    setOrderField('providerAddress', provider.address || provider.base_address || 'Essaouira, Morocco');
    setOrderField('providerRating', provider.rating || 0);
    setOrderField('providerJobsCount', provider.taskCount || 0);
    setOrderField('providerRank', ((provider.taskCount || 0) < 10 || provider.isNew) ? 'New' : (provider.badge || 'Classic'));
    setOrderField('providerBio', provider.bio || provider.aboutMe || '');
    setOrderField('providerExperience', provider.yearsOfExperience || '1 Year');
    setOrderField('providerCoords', provider.base_lat ? { lat: provider.base_lat, lng: provider.base_lng } : null);

    if (order.serviceType === 'car_rental') {
      setViewedBricoler(provider);
    } else if (order.serviceType === 'errands' || SERVICES_REQUIRING_SETUP.includes(order.serviceType || '')) {
      setIsSplashing(true);
      setTimeout(() => {
        router.push('/order/setup');
      }, 1500);
    } else {
      setIsSplashing(true);
      setTimeout(() => {
        router.push('/order/step3');
      }, 1500);
    }
  };

  const handleModalSelect = (car: any, note: string, dates: any) => {
    // Note: Provider info already saved in handleSelect when opening modal
    setOrderField('providerRate', car.pricePerDay || car.price || calculateRate(viewedBricoler));
    setOrderField('selectedCar', car);
    setOrderField('carRentalNote', note);
    setOrderField('carRentalDates', dates);
    setOrderField('date', dates.pickupDate);
    setOrderField('time', dates.pickupTime);

    setIsSplashing(true);
    setTimeout(() => {
      router.push('/order/step3');
    }, 1500);
  };

  return (
    <>
      <style>{`
        .step2-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: #fff;
          overflow: hidden;
        }
        .step2-container {
          position: relative;
          height: 100vh;
          overflow: hidden;
          background: #f8fafc;
        }
        .step2-map {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .step2-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 10;
          background: transparent;
          padding: 8px 0;
          padding-bottom: calc(24px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
        }
        .step2-cards {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 8px 20px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .step2-cards::-webkit-scrollbar { display: none; }
        .provider-card-wrapper {
          flex: 0 0 82%;
          scroll-snap-align: center;
          height: auto;
          min-height: 120px;
        }
        @media (max-width: 360px) {
          .provider-card-wrapper {
            flex: 0 0 90%;
          }
        }
        .provider-info-row {
          display: flex;
          gap: 12px;
          margin-bottom: 4px;
          flex-shrink: 0;
        }
        @media (max-width: 480px) {
          .provider-info-row {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .provider-info-row .info-content {
            align-items: center !important;
          }
          .provider-info-row .info-header {
            justify-content: center !important;
          }
           .provider-info-row .bio-text {
            text-align: center !important;
          }
        }
      `}</style>

      <div className="step2-container">
        {isSplashing && <SplashScreen subStatus={null} />}
        {/* ── MAP HEADER (FULL BACKGROUND) ── */}
        <div className="step2-map">
          <MapView
            initialLocation={{ lat: clientLat, lng: clientLng }}
            interactive={true}
            onLocationChange={() => { }}
            providerPins={providerPins}
            focusedProviderId={focusedId}
            lockCenterOnFocus={false}
            disableFitBounds={true}
            clientPin={{ lat: clientLat, lng: clientLng }}
            serviceIconUrl={serviceType === 'car_rental' ? '/Images/Vectors Illu/carKey.png' : (order.serviceIcon || undefined)}
            showCenterPin={false}
            pinY={50}
            zoom={16}
            onProviderClick={handleProviderClick}
            onInteractionStart={() => setIsInteracting(true)}
            onInteractionEnd={() => setIsInteracting(false)}
          />

          {/* TOP NAV BUTTONS */}
          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000, display: 'flex', justifyContent: 'space-between' }}>
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#fff', border: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ChevronLeft size={22} color="#111827" />
            </button>

            {/* Close Button */}
            <button
              onClick={saveDraftAndExit}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#fff', border: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={20} color="#111827" />
            </button>
          </div>

        </div>

        {/* ── BOTTOM SHEET ── */}
        <motion.div
          className="step2-sheet"
          initial={false}
          animate={{
            y: isInteracting ? 500 : 0,
            opacity: isInteracting ? 0 : 1
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 200
          }}
          style={{ pointerEvents: isInteracting ? 'none' : 'auto' }}
        >
          {/* SHEET HEADER (Simplified) */}
          <div style={{ padding: '20px 0 12px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 40, height: 5, background: '#E5E7EB', borderRadius: 10 }}></div>
          </div>

          {/* Provider cards (Horizontal Scroll) */}
          <div className="step2-cards" ref={cardsRef} onScroll={handleScroll}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, flex: 1, color: '#9CA3AF', fontSize: 14 }}>
                Finding Bricolers...
              </div>
            ) : providers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  No Bricolers available
                </div>
              </div>
            ) : (
              providers.map(provider => (
                <div key={provider.id} className="provider-card-wrapper">
                  <ProviderCard
                    provider={provider}
                    clientLat={clientLat}
                    clientLng={clientLng}
                    isSelected={focusedId === provider.id}
                    onSelect={() => handleSelect(provider)}
                    order={order}
                    displayRate={calculateRate(provider)}
                  />
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Profile Modal for Car Rental */}
        <CarRentalProfileModal
          isOpen={!!viewedBricoler}
          onClose={() => setViewedBricoler(null)}
          provider={viewedBricoler}
          onSelect={handleModalSelect}
          order={order}
          displayRate={viewedBricoler ? calculateRate(viewedBricoler) : 0}
        />
      </div>
    </>
  );
}

function ProviderCard({
  provider, clientLat, clientLng, isSelected, onSelect, order, displayRate
}: {
  provider: any;
  clientLat: number;
  clientLng: number;
  isSelected: boolean;
  onSelect: () => void;
  order: any;
  displayRate: number;
}) {
  const [roadInfo, setRoadInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

  const isAvailableToday = () => {
    if (!provider.availability) return provider.availableToday || false;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = days[new Date().getDay()];
    const slots = provider.availability[today];
    return Array.isArray(slots) && slots.length > 0;
  };

  const available = isAvailableToday();

  const getRankBadge = () => {
    const isNew = ((provider.taskCount || 0) < 10 || provider.isNew);
    if (isNew) return { text: 'NEW', bg: '#F5F3FF', color: '#7C3AED', icon: '✦' };

    const badge = provider.badge?.toUpperCase() || 'CLASSIC';
    if (badge === 'ELITE') return { text: 'ELITE', bg: '#FFF7ED', color: '#EA580C', icon: '🏆' };
    if (badge === 'PRO') return { text: 'PRO', bg: '#F0FDF4', color: '#16A34A', icon: '💎' };
    return { text: badge, bg: '#F3F4F6', color: '#4B5563', icon: '🛡️' };
  };

  const rank = getRankBadge();

  useEffect(() => {
    if (!provider.base_lat || !provider.base_lng) return;
    getRoadDistance(clientLat, clientLng, provider.base_lat, provider.base_lng)
      .then(setRoadInfo);
  }, [provider.id, clientLat, clientLng]);

  const isCarRental = order.serviceType === 'car_rental';
  const avatar = provider.avatarUrl || provider.avatar || provider.photoURL;

  return (
    <div
      onClick={onSelect}
      style={{
        border: isSelected ? '0.5px solid #219178' : '1px solid #F3F4F6',
        borderRadius: 10,
        padding: '16px',
        background: '#fff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isSelected ? '0 10px 25px rgba(1, 160, 131, 0.12)' : '0 2px 12px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        height: '100%',
        minHeight: '145px'
      }}>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Left: Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: avatar ? 'transparent' : '#F3F4F6',
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          {avatar
            ? <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontWeight: 900, color: '#374151', fontSize: 18 }}>{provider.name?.charAt(0).toUpperCase()}</div>
          }
        </div>

        {/* Center/Main Info Stack */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 950, color: '#111827', lineHeight: 1.2 }}>
            {provider.name}
          </div>

          <span style={{
            background: rank.bg, color: rank.color,
            fontSize: 9, fontWeight: 950,
            padding: '2px 8px', borderRadius: 4,
            display: 'inline-flex', alignItems: 'center', gap: 2,
            alignSelf: 'flex-start'
          }}>
            <span>{rank.icon}</span> {rank.text}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Star size={12} fill="#FBBF24" color="#FBBF24" />
            <span style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>
              {provider.rating && Number(provider.rating) > 0 ? Number(provider.rating).toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        {/* Right side Stack (Price & Availability) */}
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 75 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 950, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
              MAD {displayRate} <span style={{ color: '#9CA3AF', fontWeight: 900, fontSize: 11 }}>(min)</span>
              <div style={{ width: 14, height: 14, background: '#219178', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={8} color="#fff" strokeWidth={4} />
              </div>
            </div>
          </div>

          <span style={{
            background: available ? 'rgba(1, 160, 131, 0.05)' : '#F9FAFB',
            color: available ? '#01A082' : '#9CA3AF',
            fontSize: 9, fontWeight: 950,
            padding: '4px 10px', borderRadius: 50,
            border: available ? '1px solid rgba(1, 160, 131, 0.15)' : '1px solid #E5E7EB',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            textTransform: 'uppercase'
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: available ? '#01A082' : '#D1D5DB' }}></span>
            {available ? 'AVAILABLE TODAY' : 'UNAVAILABLE TODAY'}
          </span>
        </div>
      </div>

      {/* Bottom Row: Tasks List (Pic 3 style) */}
      <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F9FAFB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1.5px solid #9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={9} color="#9CA3AF" />
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 900 }}>
            {provider.taskCount || 0} {order.serviceName || (isCarRental ? 'Car rental' : 'tasks')}
          </span>
        </div>

        {roadInfo && (
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> {roadInfo.distanceKm} km · ~{roadInfo.durationMinutes} min
          </div>
        )}
      </div>

      {/* Brand Logo Strip for Car Rentals remains if needed, but simplified */}
      {isCarRental && provider.carRentalDetails?.cars && provider.carRentalDetails.cars.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8, overflowX: 'auto' }} className="no-scrollbar">
          {/* ... brands logic simplified ... */}
        </div>
      )}
    </div>
  );
}

export default function Step2Page() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
      <Step2Content />
    </Suspense>
  );
}
