'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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

const SERVICES_REQUIRING_SETUP = [
  'cleaning', 'home_repairs', 'furniture_assembly', 'moving', 'mounting',
  'plumbing', 'electricity', 'painting', 'appliance_installation',
  'glass_cleaning', 'gardening', 'babysitting', 'pool_cleaning',
  'pets_care', 'elderly_care', 'cooking'
];

// ── Moving Vehicle Requirement Popup ────────────────────────────────
function MovingVehiclePopup({
  isOpen,
  onSelect
}: {
  isOpen: boolean;
  onSelect: (vehicleType: string | null) => void
}) {
  const [step, setStep] = useState(1);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const vehicleOptions = [
    { id: 'triporteur', label: { en: 'Triporteur', fr: 'Triporteur', ar: 'تربورتور' }, icon: '🛵' },
    { id: 'small_van', label: { en: 'Small Van', fr: 'Petit Van', ar: 'سيارة "برلانكو"' }, icon: '🚐' },
    { id: 'large_van', label: { en: 'Large Van', fr: 'Grand Van', ar: 'شاحنة فورد ترانزيت' }, icon: '🚚' },
    { id: 'small_truck', label: { en: 'Small Truck', fr: 'Petit Camion', ar: 'شاحنة صغيرة' }, icon: '🚛' },
    { id: 'large_truck', label: { en: 'Large Truck', fr: 'Grand Camion', ar: 'شاحنة كبيرة' }, icon: '🚛' },
  ];

  return (
    <div className="fixed inset-0 z-[5000] bg-white flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full space-y-8">
        {step === 1 ? (
          <>
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-[#027963]/10 rounded-[5px] flex items-center justify-center text-4xl mx-auto">🚚</div>
              <div className="space-y-2">
                <h2 className="text-2xl font-medium text-neutral-900 leading-tight">
                  {t({ en: 'Do you need your Bricoler to provide a vehicle?', fr: 'Avez-vous besoin que votre Bricoleur fournisse un véhicule ?', ar: 'هل تحتاج من "البريكولير" توفير وسيلة نقل؟' })}
                </h2>
                <p className="text-neutral-500 font-medium text-[15px] px-2">
                  {t({
                    en: "This helps us match you to the right Bricolers based on your task. If you're providing your own vehicle, select \"No\".",
                    fr: "Cela nous aide à vous mettre en relation avec les bons Bricoleurs. Si vous fournissez votre propre véhicule, sélectionnez \"Non\"",
                    ar: "هذا يساعدنا في العثور على الشخص المناسب لمهمتك. إذا كنت ستوفر وسيلة النقل بنفسك، فاختر \"لا\"."
                  })}
                </p>
              </div>
            </div>
            <div className="w-full space-y-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep(2)}
                className="w-full py-4.5 bg-[#027963] text-white rounded-full font-medium text-lg transition-all"
              >
                {t({ en: 'Yes, I need a vehicle', fr: 'Oui, j\'ai besoin d\'un véhicule', ar: 'نعم، أحتاج وسيلة نقل' })}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(null)}
                className="w-full py-4.5 bg-neutral-100 text-neutral-900 rounded-full font-medium text-lg transition-all"
              >
                {t({ en: 'No, I don\'t need a vehicle', fr: 'Non, je n\'en ai pas besoin', ar: 'لا، لا أحتاج وسيلة نقل' })}
              </motion.button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-medium text-neutral-900 leading-tight">
                {t({ en: 'Which transportation mean you need?', fr: 'De quel moyen de transport avez-vous besoin ?', ar: 'ما هي وسيلة النقل التي تحتاجها؟' })}
              </h2>
            </div>
            <div className="w-full grid grid-cols-1 gap-3 overflow-y-auto max-h-[60vh] px-1 pb-4 no-scrollbar">
              {vehicleOptions.map((opt, idx) => (
                <motion.button
                  key={opt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(opt.id)}
                  className="flex items-center gap-5 p-5 bg-white border border-neutral-100 rounded-[5px] text-left hover:border-[#027963] hover:bg-neutral-50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-[5px] bg-neutral-50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">{opt.icon}</div>
                  <div className="font-medium text-neutral-900 text-lg">{t(opt.label)}</div>
                </motion.button>
              ))}
              <button
                onClick={() => setStep(1)}
                className="w-full py-4 text-neutral-400 font-bold uppercase tracking-widest text-[11px] hover:text-neutral-600 transition-colors mt-4"
              >
                {t({ en: 'Go back', fr: 'Retour', ar: 'رجوع' })}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step2Content() {
  const { t } = useLanguage();
  const router = useRouter();
  const { order, setOrderField } = useOrder();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isSplashing, setIsSplashing] = useState(false);
  const [showVehiclePopup, setShowVehiclePopup] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [hasAnsweredVehicle, setHasAnsweredVehicle] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  const clientLat = order.location?.lat || 31.5085;
  const clientLng = order.location?.lng || -9.7595;
  const serviceType = order.serviceType || '';

  // ── Show vehicle popup for moving ──────────────────────────────────
  useEffect(() => {
    if (serviceType === 'moving' && !hasAnsweredVehicle) {
      setShowVehiclePopup(true);
    }
  }, [serviceType, hasAnsweredVehicle]);

  // ── Fetch providers (Real-time Live Location) ────────────────────────
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'bricolers'),
      where('isActive', '==', true),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      try {
        const all = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            taskCount: data.completedJobs || data.taskCount || data.numReviews || data.jobsDone || 0,
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
            if (order.subServiceId) {
              return s.subServiceId === order.subServiceId ||
                s.subServiceName === order.subServiceName ||
                s.id === order.subServiceId;
            }
            return true;
          });
        });

        // Filter: vehicle requirement for moving
        const withVehicle = filtered.filter(b => {
          if (serviceType === 'moving' && selectedVehicle) {
            const transports = b.movingTransports || (b.movingTransport ? [b.movingTransport] : []);
            return transports.includes(selectedVehicle);
          }
          return true;
        });

        // Filter: must have GPS and client must be within their radius (Live position prioritized)
        const inRange = withVehicle.filter(b => {
          const lat = (b.isLive && b.current_lat) ? b.current_lat : b.base_lat;
          const lng = (b.isLive && b.current_lng) ? b.current_lng : b.base_lng;
          if (!lat || !lng) return true;
          const dist = calculateDistance(clientLat, clientLng, lat, lng);
          return dist <= (b.service_radius_km || 15);
        });

        const sorted = inRange.sort((a, b) => {
          const scoreA = matchScore(a, clientLat, clientLng, serviceType);
          const scoreB = matchScore(b, clientLat, clientLng, serviceType);
          return scoreB - scoreA;
        });

        setProviders(sorted);
        if (sorted.length > 0 && !focusedId) setFocusedId(sorted[0].id);

      } catch (e) {
        console.error('Failed to process providers snapshot:', e);
      } finally {
        setLoading(false);
      }
    }, (err) => {
       console.error('Provider onSnapshot error:', err);
       setLoading(false);
    });

    return () => unsubscribe();
  }, [clientLat, clientLng, serviceType, selectedVehicle]);

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
    const cardWidth = container.offsetWidth * 0.75 + 12; // matching wrapper width + gap
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
      const cardWidth = container.offsetWidth * 0.75 + 12; // match wrapper width + gap
      container.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      });
    }
  };

  // ── Provider pin data for MapView ────────────────────────────────────
  const providerPins = providers.map(p => ({
    id: p.id,
    lat: (p.isLive && p.current_lat) ? p.current_lat : (p.base_lat || clientLat + (Math.random() - 0.5) * 0.015),
    lng: (p.isLive && p.current_lng) ? p.current_lng : (p.base_lng || clientLng + (Math.random() - 0.5) * 0.015),
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
    setOrderField('providerBioTranslations', provider.bio_translations || {});
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
      <MovingVehiclePopup
        isOpen={showVehiclePopup}
        onSelect={(val) => {
          setSelectedVehicle(val);
          setHasAnsweredVehicle(true);
          setShowVehiclePopup(false);
          setOrderField('vehicleType', val);
        }}
      />

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
          flex: 0 0 68%;
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
            disableFitBounds={false}
            clientPin={{ lat: clientLat, lng: clientLng }}
            serviceIconUrl={serviceType === 'car_rental' ? '/Images/Vectors Illu/carKey.png' : (order.serviceIcon || undefined)}
            showCenterPin={false}
            pinY={50}
            zoom={14}
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
        border: isSelected ? '1px solid #027963' : '1px solid #F3F4F6',
        borderRadius: 15,
        padding: '12px 14px',
        background: '#fff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        height: '100%',
        minHeight: '135px'
      }}>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Left: Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
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
          <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', lineHeight: 1.2 }}>
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
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
              {provider.rating && Number(provider.rating) > 0 ? Number(provider.rating).toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        {/* Right side Stack (Price & Availability) */}
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 75 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
              MAD {displayRate} <span style={{ color: '#9CA3AF', fontWeight: 500, fontSize: 10 }}>(min)</span>
              <div style={{ width: 14, height: 14, background: '#027963', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={8} color="#fff" strokeWidth={4} />
              </div>
            </div>
          </div>

          {available && (
            <span style={{
              background: 'rgba(1, 160, 131, 0.05)',
              color: '#01A082',
              fontSize: 9, fontWeight: 950,
              padding: '4px 10px', borderRadius: 50,
              border: '1px solid rgba(1, 160, 131, 0.15)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              textTransform: 'uppercase'
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#01A082' }}></span>
              AVAILABLE TODAY
            </span>
          )}
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

      {/* Brand Logo Strip for Car Rentals */}
      {isCarRental && provider.carRentalDetails?.cars && provider.carRentalDetails.cars.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }} className="no-scrollbar">
          {(() => {
            const brands = Array.from(new Set(provider.carRentalDetails.cars.map((c: any) => c.brandId)));
            return brands.map((bId: any) => {
              const brand = CAR_BRANDS.find(b => b.id === bId);
              if (!brand) return <div key={bId} style={{ fontSize: 10, fontWeight: 900, color: '#9CA3AF', background: '#F9FAFB', padding: '4px 8px', borderRadius: 4 }}>{bId}</div>;
              return (
                <div key={bId} style={{ width: 28, height: 28, background: '#F9FAFB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, border: '1px solid #F3F4F6', flexShrink: 0 }} title={brand.name}>
                  {brand.logo ? <img src={brand.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={brand.name} /> : <span style={{ fontSize: 8 }}>{brand.name}</span>}
                </div>
              );
            });
          })()}
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
