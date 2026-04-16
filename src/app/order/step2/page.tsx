'use client';
import { safeStorage } from '@/lib/safeStorage';
import { useEffect, useState, Suspense, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { calculateDistance, getRoadDistance } from '@/lib/calculateDistance';
import { matchScore } from '@/lib/matchBricolers';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Clock, MapPin, CheckCircle2, ChevronLeft, Check, Trophy, Calendar } from 'lucide-react';
import SplashScreen from '@/components/layout/SplashScreen';
import { CAR_BRANDS } from '@/config/cars_config';
import { CarRentalProfileModal } from './CarRentalProfileModal';
import DiscoveryFilters from './DiscoveryFilters';
import LocationPicker from '@/components/location-picker/LocationPicker';
import { SavedAddress } from '@/components/location-picker/types';

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
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null);
  const [selectedFilterTime, setSelectedFilterTime] = useState<string | null>(null);
  const [userSavedAddresses, setUserSavedAddresses] = useState<SavedAddress[]>([]);
  const cardsRef = useRef<HTMLDivElement>(null);

  const finalLat = order.location?.lat || 31.5085;
  const finalLng = order.location?.lng || -9.7595;
  
  const searchLat = order.discoveryLocation?.lat || finalLat;
  const searchLng = order.discoveryLocation?.lng || finalLng;
  const memoizedSearchLoc = useMemo(() => ({ lat: Number(searchLat), lng: Number(searchLng) }), [searchLat, searchLng]);
  const memoizedFinalLoc = useMemo(() => ({ lat: Number(finalLat), lng: Number(finalLng) }), [finalLat, finalLng]);
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
          const tasks = Number(data.completedJobs || data.numReviews || data.jobsDone || data.taskCount || 0);
          return {
            id: d.id,
            ...data,
            taskCount: tasks,
            rating: Number(data.rating || 0),
            numReviews: Number(data.numReviews || 0),
            experience: data.yearsOfExperience || data.experience || data.experienceYears || '1 Year'
          };
        }) as any[];

        // Filter: must offer the selected service category and potentially sub-service
        const filtered = all.filter(b => {
          if (!Array.isArray(b.services)) return false;

          const normalizeSubId = (id: string | undefined | null) => {
            if (!id) return null;
            const strId = String(id).toLowerCase().trim();
            const map: Record<string, string> = {
              'family_home': 'standard_small',
              'hospitality': 'hospitality_turnover',
              'car_washing': 'car_wash'
            };
            return map[strId] || strId;
          };

          const targetSubId = normalizeSubId(order.subServiceId);
          const safeServiceType = String(serviceType).toLowerCase().trim();

          return b.services.some((s: any) => {
            // Case 1: The service is just a string (e.g., "cleaning")
            if (typeof s === 'string') {
              const sNorm = normalizeSubId(s);
              return sNorm === safeServiceType || (targetSubId && sNorm === targetSubId);
            }

            // Case 2: Object format (Standard)
            const sCatId = typeof s.categoryId === 'string' ? s.categoryId.toLowerCase().trim() : null;
            const sServId = typeof s.serviceId === 'string' ? s.serviceId.toLowerCase().trim() : null;
            const sId = typeof s.id === 'string' ? s.id.toLowerCase().trim() : null;

            const catMatch = (sCatId === safeServiceType) || (sServId === safeServiceType) || (sId === safeServiceType);

            if (!catMatch) return false;

            // If they match the category, check sub-service if applicable
            if (targetSubId) {
              const sSubServId = typeof s.subServiceId === 'string' ? s.subServiceId.toLowerCase().trim() : null;
              const bSubId = normalizeSubId(sSubServId || sId);

              if (bSubId === targetSubId) return true;
              if (s.subServiceName && order.subServiceName &&
                s.subServiceName.toLowerCase().trim() === order.subServiceName.toLowerCase().trim()) return true;

              // Optional structure: array of subservices
              if (Array.isArray(s.subServices)) {
                const hasSubMatch = s.subServices.some((sub: any) => {
                  const subIdVal = typeof sub === 'string' ? sub : (sub.id || sub.subServiceId);
                  return normalizeSubId(subIdVal) === targetSubId;
                });
                if (hasSubMatch) return true;
              }

              // If the provider obj doesn't specify any sub-service identifiers, 
              // we can assume they just offer the whole category.
              if (!sSubServId && !sId && !s.subServices) {
                return true;
              }

              return false;
            }

            return true;
          });
        });

        // Filter: must have GPS and client must be within their radius (Live position prioritized)
        const inRange = filtered.filter(b => {
          const lat = (b.isLive && b.current_lat) ? b.current_lat : b.base_lat;
          const lng = (b.isLive && b.current_lng) ? b.current_lng : b.base_lng;
          if (!lat || !lng) return true;
          // IMPORTANT: Distance check for radius must be against the FINAL destination (finalLat/Lng)
          const dist = calculateDistance(finalLat, finalLng, lat, lng);
          // Standard discovery radius is now 100km to allow cross-city booking
          return dist <= 100;
        });

        // Mark availability by Routine & Vehicle
        const finalProviders = inRange.map((b: any) => {
          let matchesTime = true;
          let matchesVehicle = true;

          // Time Filter
          if (selectedFilterDate && selectedFilterTime) {
            const DAYS_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayOfWeekLower = DAYS_NAMES[selectedFilterDate.getDay()];
            const routineKey = Object.keys(b.routine || {}).find(k => k.toLowerCase() === dayOfWeekLower);
            const routine = routineKey ? b.routine[routineKey] : null;
            
            if (!routine || !routine.active) {
              matchesTime = false;
            } else {
              const startTime = routine.from || routine.start;
              const endTime = routine.to || routine.end;
              if (startTime && endTime) {
                matchesTime = selectedFilterTime >= startTime && selectedFilterTime < endTime;
              }
            }
          }

          // Vehicle Filter for Moving
          if (serviceType === 'moving' && selectedVehicle) {
            const transports = b.movingTransports || (b.movingTransport ? [b.movingTransport] : []);
            matchesVehicle = transports.includes(selectedVehicle);
          }

          return { ...b, isFilteredOut: !(matchesTime && matchesVehicle) };
        });

        const sorted = finalProviders.sort((a: any, b: any) => {
          // If availability differs, show available ones first
          if (a.isFilteredOut !== b.isFilteredOut) {
            return a.isFilteredOut ? 1 : -1;
          }
          const scoreA = matchScore(a, finalLat, finalLng, serviceType);
          const scoreB = matchScore(b, finalLat, finalLng, serviceType);
          return scoreB - scoreA;
        });

        setProviders(sorted);
        // Don't select any provider by default - let the user see the whole map first

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
  }, [finalLat, finalLng, searchLat, searchLng, serviceType, selectedVehicle, selectedFilterDate, selectedFilterTime]);

  const handleLocationConfirm = (result: { pickup: any, savedAddress?: SavedAddress }) => {
    const loc = {
      lat: result.pickup.lat,
      lng: result.pickup.lng,
      address: result.pickup.address,
      city: result.pickup.city || '',
      area: result.pickup.area || '',
      ...result.savedAddress
    };
    setOrderField('discoveryLocation', loc);
    setShowLocationPicker(false);
  };

  useEffect(() => {
    const saved = safeStorage.getItem('lbricol_saved_addresses');
    if (saved) {
      try {
        setUserSavedAddresses(JSON.parse(saved));
      } catch {}
    }
  }, []);

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
      const existing = JSON.parse(safeStorage.getItem('lbricol_order_drafts') || '[]');
      const draftWithId = { ...draftData, id: `draft_${Date.now()}` };
      existing.push(draftWithId);
      safeStorage.setItem('lbricol_order_drafts', JSON.stringify(existing));
    }
    router.push('/?tab=calendar');
  };

  // ── Scroll Sync ──────────────────────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.offsetWidth;
    const children = Array.from(container.children);

    if (children.length === 0) return;

    const viewportCenter = scrollLeft + containerWidth / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    children.forEach((child, idx) => {
      const childRect = (child as HTMLElement);
      const childCenter = childRect.offsetLeft + childRect.offsetWidth / 2;
      const distance = Math.abs(viewportCenter - childCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    if (providers[closestIndex] && focusedId !== providers[closestIndex].id) {
      setFocusedId(providers[closestIndex].id);
    }
  };

  const handleProviderClick = (id: string) => {
    setFocusedId(id);
    const cardElement = document.getElementById(`provider-card-${id}`);
    if (cardElement) {
      cardElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  const calculateRate = useCallback((provider: any) => {
    const isCarRental = order.serviceType === 'car_rental';
    const cars = provider.carRentalDetails?.cars || [];
    if (isCarRental && cars.length > 0) {
      return Math.min(...cars.map((c: any) => Number(c.pricePerDay || c.price || 9999)));
    }

    const services = Array.isArray(provider.services) ? provider.services : [];

    if (order.subServiceId) {
      const subSvcId = String(order.subServiceId).toLowerCase();
      const subSvcInfo = services.find((s: any) =>
        String(s.subServiceId || s.id).toLowerCase() === subSvcId
      );
      if (subSvcInfo) return Number(subSvcInfo.hourlyRate || subSvcInfo.price || provider.minRate || 80);
    }

    const catId = String(order.serviceType).toLowerCase();
    const catInfo = services.find((s: any) =>
      String(s.categoryId || s.id).toLowerCase() === catId
    );
    if (catInfo) return Number(catInfo.hourlyRate || catInfo.price || provider.minRate || 80);

    return Number(provider.minRate || 80);
  }, [order.serviceType, order.subServiceId]);

  const providerPins = useMemo(() => {
    const posCounts: { [key: string]: number } = {};
    
    return providers.map(p => {
      const baseLat = (p.isLive && p.current_lat) ? p.current_lat : (p.base_lat || searchLat + (Math.random() - 0.5) * 0.01);
      const baseLng = (p.isLive && p.current_lng) ? p.current_lng : (p.base_lng || searchLng + (Math.random() - 0.5) * 0.01);
      
      const key = `${baseLat.toFixed(4)}_${baseLng.toFixed(4)}`;
      const indexAtPos = posCounts[key] || 0;
      posCounts[key] = indexAtPos + 1;
      
      // If multiple pins share coordinates, shift them slightly in a spiral pattern
      let jitterLat = 0;
      let jitterLng = 0;
      if (indexAtPos > 0) {
        const angle = indexAtPos * 137.5 * (Math.PI / 180);
        const radius = 0.0006 * Math.sqrt(indexAtPos); // Gradual spiral - increased for better separation
        jitterLat = Math.cos(angle) * radius;
        jitterLng = Math.sin(angle) * radius;
      }

      return {
        id: p.id,
        lat: baseLat + jitterLat,
        lng: baseLng + jitterLng,
        isLive: !!(p.isLive && p.current_lat),
        rate: calculateRate(p),
        rating: p.rating || 0.0,
        taskCount: p.taskCount || 0,
        name: p.name,
        avatarUrl: p.avatarUrl || p.avatar || p.photoURL,
        isSelected: p.id === focusedId,
        isFilteredOut: p.isFilteredOut,
        zIndexOffset: indexAtPos * 5,
        badge: ((p.taskCount || 0) < 10 || p.isNew) ? 'NEW' : (p.badge || 'CLASSIC'),
      };
    });
  }, [providers, focusedId, searchLat, searchLng, calculateRate]);

  const [viewedBricoler] = useState<any>(null);

  const handleSelect = (provider: any) => {
    setFocusedId(provider.id);
    const rate = calculateRate(provider);

    setOrderField('providerId', provider.id);
    setOrderField('providerName', provider.name);
    setOrderField('providerAvatar', provider.avatarUrl || provider.avatar || provider.photoURL || null);
    setOrderField('providerRate', rate);
    setOrderField('providerAddress', provider.address || provider.base_address || 'Essaouira, Morocco');
    setOrderField('providerRating', provider.rating || 0);
    setOrderField('providerJobsCount', provider.taskCount || 0);
    setOrderField('providerRank', ((provider.taskCount || 0) < 10 || provider.isNew) ? 'New' : (provider.badge || 'Classic'));
    const servicesList = Array.isArray(provider.services) ? provider.services : [];
    const targetCatIdSelect = String(order.serviceType || '').toLowerCase();
    const targetSubIdSelect = String(order.subServiceId || '').toLowerCase();
    const relevantServiceSelect = servicesList.find((s: any) => {
      const sCatId = String(s.categoryId || s.serviceId || s.id || '').toLowerCase();
      const sSubId = String(s.subServiceId || s.id || '').toLowerCase();
      return (targetSubIdSelect && sSubId === targetSubIdSelect) || (targetCatIdSelect && sCatId === targetCatIdSelect);
    });

    setOrderField('providerBio', relevantServiceSelect?.pitch || provider.bio || provider.aboutMe || '');
    setOrderField('providerBioTranslations', provider.bio_translations || {});
    setOrderField('providerExperience', relevantServiceSelect?.experience || provider.yearsOfExperience || provider.experience || '1 Year');
    const lat = (provider.isLive && provider.current_lat) ? provider.current_lat : provider.base_lat;
    const lng = (provider.isLive && provider.current_lng) ? provider.current_lng : provider.base_lng;
    setOrderField('providerCoords', lat ? { lat, lng } : null);

    if (order.serviceType === 'errands' || SERVICES_REQUIRING_SETUP.includes(order.serviceType || '')) {
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
          background: #fff;
          padding: 0;
          padding-bottom: calc(20px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          border-radius: 32px 32px 0 0;
          box-shadow: 0 -12px 40px rgba(0,0,0,0.12);
          border-top: 1px solid rgba(0,0,0,0.02);
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
      `}</style>

      <div className="step2-container">
        {isSplashing && <SplashScreen subStatus={null} />}
        <div className="step2-map">
          <MapView
            initialLocation={memoizedSearchLoc}
            interactive={true}
            onLocationChange={() => { }}
            providerPins={providerPins}
            focusedProviderId={focusedId}
            lockCenterOnFocus={false}
            disableFitBounds={false}
            clientPin={memoizedFinalLoc}
            serviceIconUrl={serviceType === 'car_rental' ? '/Images/Vectors Illu/carKey.png' : (order.serviceIcon || undefined)}
            showCenterPin={false}
            pinY={38}
            zoom={14}
            onProviderClick={handleProviderClick}
            onInteractionStart={() => setIsInteracting(true)}
            onInteractionEnd={() => setIsInteracting(false)}
          />

          <div style={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000, display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => router.back()}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#fff', border: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ChevronLeft size={22} color="#111827" />
            </button>

            <div className="flex-1 px-3 min-w-0">
              <DiscoveryFilters
                discoveryLocation={order.discoveryLocation}
                selectedDate={selectedFilterDate}
                selectedTime={selectedFilterTime}
                onChangeLocation={() => setShowLocationPicker(true)}
                onSelectTime={(date, time) => {
                  setSelectedFilterDate(date);
                  setSelectedFilterTime(time);
                }}
              />
            </div>

            <button
              onClick={saveDraftAndExit}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: '#fff', border: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <X size={20} color="#111827" />
            </button>
          </div>
        </div>

        <motion.div
          className="step2-sheet"
          initial={false}
          animate={{
            y: (!focusedId || isInteracting) ? 800 : 0,
            opacity: (!focusedId || isInteracting) ? 0.3 : 1
          }}
          transition={{
            type: 'spring',
            damping: 30,
            stiffness: 300,
            mass: 0.5
          }}
          style={{ pointerEvents: (!focusedId || isInteracting) ? 'none' : 'auto' }}
        >
          <div style={{ padding: '16px 20px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 10, marginBottom: 16 }}></div>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 25, fontWeight: 750, color: '#111827', letterSpacing: '-0.3px', margin: 0, lineHeight: 1 }}>
                  {focusedId ? t({ en: 'Bricoler Details', fr: 'Détails du Bricoleur', ar: 'تفاصيل بريكولير' }) : t({ en: 'Ideal Bricolers', fr: 'Bricoleurs Idéaux', ar: 'بريكولير مثالي' })}
                </h3>
              </div>

              {focusedId && (
                <button
                  onClick={() => setFocusedId(null)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none'
                  }}
                >
                  <X size={20} color="#6B7280" />
                </button>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }} className="no-scrollbar">
            {focusedId ? (() => {
              const provider = providers.find(p => p.id === focusedId);
              if (!provider) return null;
              return (
                <div style={{ padding: '20px' }}>
                  <BricolerDetails
                    provider={provider}
                    order={order}
                    displayRate={calculateRate(provider)}
                    onBook={() => handleSelect(provider)}
                  />
                </div>
              );
            })() : (
              <div className="step2-cards" ref={cardsRef} onScroll={handleScroll}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 32, flex: 1, color: '#9CA3AF', fontSize: 14 }}>
                    {t({ en: 'Finding Bricolers...', fr: 'Recherche de Bricoleurs...', ar: 'جاري البحث عن "بريكولير"...' })}
                  </div>
                ) : providers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                      {t({ en: 'No Bricolers available', fr: 'Aucun Bricoleur disponible', ar: 'لا يوجد "بريكولير" متاحون' })}
                    </div>
                  </div>
                ) : (
                  providers.filter(p => !p.isFilteredOut).map(provider => (
                    <div key={provider.id} id={`provider-card-${provider.id}`} className="provider-card-wrapper">
                      <ProviderCard
                        provider={provider}
                        finalLat={finalLat}
                        finalLng={finalLng}
                        isSelected={focusedId === provider.id}
                        onSelect={() => handleSelect(provider)}
                        order={order}
                        displayRate={calculateRate(provider)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>

        <CarRentalProfileModal
          isOpen={!!viewedBricoler}
          onClose={() => { }}
          provider={viewedBricoler}
          onSelect={handleModalSelect}
          order={order}
          displayRate={viewedBricoler ? calculateRate(viewedBricoler) : 0}
        />

        <AnimatePresence>
          {showLocationPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed inset-0 z-[10000]"
            >
              <LocationPicker
                mode="single"
                onConfirm={handleLocationConfirm}
                onClose={() => setShowLocationPicker(false)}
                savedAddresses={userSavedAddresses}
                autoLocate={false}
                serviceType={serviceType}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function BricolerDetails({
  provider, order, displayRate, onBook
}: {
  provider: any;
  order: any;
  displayRate: number;
  onBook: () => void;
}) {
  const { t } = useLanguage();
  const avatar = provider.avatarUrl || provider.avatar || provider.photoURL;
  const ratingStr = (!provider.taskCount || provider.taskCount === 0 || !provider.rating) ? '0.0' : provider.rating.toFixed(1);
  
  // Find relevant service entry for specific pitch/experience
  const relevantService = useMemo(() => {
    if (!Array.isArray(provider.services)) return null;
    const targetCatId = String(order.serviceType || '').toLowerCase();
    const targetSubId = String(order.subServiceId || '').toLowerCase();
    
    return provider.services.find((s: any) => {
      const sCatId = String(s.categoryId || s.serviceId || s.id || '').toLowerCase();
      const sSubId = String(s.subServiceId || s.id || '').toLowerCase();
      return (targetSubId && sSubId === targetSubId) || (targetCatId && sCatId === targetCatId);
    });
  }, [provider.services, order.serviceType, order.subServiceId]);

  // Experience calculation
  const getExperience = () => {
    return relevantService?.experience || provider.experience || provider.yearsOfExperience || '1 Year';
  };

  const bioText = relevantService?.pitch || provider.bio || provider.aboutMe;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 10 }}>
      {/* Profil Section */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div style={{
          width: 90, height: 90, borderRadius: '50%',
          border: '4px solid #fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden', flexShrink: 0,
          background: '#F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {avatar ? (
            <img src={avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 30, fontWeight: 900, color: '#374151' }}>{provider.name?.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0, lineHeight: 1 }}>
            {provider.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 950, color: '#01A083' }}>MAD {displayRate}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>minimum</span>
          </div>

          <div style={{
            marginTop: 6,
            width: 'fit-content',
            background: 'rgba(1, 160, 131, 0.05)', color: '#01A083', fontSize: 12, fontWeight: 900,
            padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6,
            border: '1px solid rgba(1, 160, 131, 0.15)'
          }}>
            <div style={{ width: 16, height: 16, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={10} color="#fff" strokeWidth={4} />
            </div>
            {t({ en: 'Verified Identity', fr: 'Identité vérifiée', ar: 'هوية مفعلة' })}
          </div>
        </div>
      </div>



      {/* 4-Item Stats Grid matching Pic 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
        {/* LEVL / NIVEAU */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
            background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Trophy size={24} color="#16A34A" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>
              {(() => {
                const tasks = provider.taskCount || 0;
                if (tasks < 10 || provider.isNew) return t({ en: 'New', fr: 'Nouveau', ar: 'جديد' });
                if (tasks > 50) return 'Elite';
                if (tasks > 20) return 'Expert';
                return 'Pro';
              })()}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
              {t({ en: 'LEVEL', fr: 'NIVEAU', ar: 'المستوى' })}
            </div>
          </div>
        </div>

        {/* RATING / NOTE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '60% 40% 30% 70% / 50% 30% 70% 50%',
            background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Star size={24} color="#FFC244" fill="#FFC244" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>{ratingStr}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
              {t({ en: 'RATING', fr: 'NOTE', ar: 'التقييم' })}
            </div>
          </div>
        </div>

        {/* TASKS / COMMANDES */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%',
            background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={24} color="#2563EB" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>{provider.taskCount || 0}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
              {t({ en: 'TASKS', fr: 'COMMANDES', ar: 'الطلبات' })}
            </div>
          </div>
        </div>

        {/* EXPERIENCE / EXPÉRIENCE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '40% 60% 50% 50% / 60% 40% 60% 40%',
            background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Calendar size={24} color="#7C3AED" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 950, color: '#111827' }}>
              {getExperience()}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.2px' }}>
              {t({ en: 'EXPERIENCE', fr: 'EXPÉRIENCE', ar: 'الخبرة' })}
            </div>
          </div>
        </div>
      </div>

      {/* Book Me button repositioned ABOVE info grid per Pic 2 */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onBook}
        style={{
          width: '100%',
          background: '#01A083',
          color: '#fff',
          border: 'none',
          borderRadius: 50,
          padding: '8px 24px',
          fontSize: 18,
          fontWeight: 650,
          cursor: 'pointer',
        }}
      >
        {t({ en: 'Book Me', fr: 'Réservez-moi', ar: 'احجز الآن' })}
      </motion.button>

      {/* About Me Section - Truncated for Bottom Sheet */}
      {bioText && (
        <div style={{ marginTop: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 8 }}>
            {t({ en: 'About me', fr: 'À propos de moi', ar: 'عني' })}
          </h3>
          <p style={{
            fontSize: 14,
            color: '#4B5563',
            lineHeight: 1.4,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {bioText}
          </p>
          <button 
            onClick={onBook}
            style={{ 
              marginTop: 8, 
              color: '#01A083', 
              fontSize: 15, 
              fontWeight: 700,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer'
            }}
          >
            {t({ en: 'Read more', fr: 'Lire la suite', ar: 'اقرأ المزيد' })}
          </button>
        </div>
      )}
    </div>
  );
}


function ProviderCard({
  provider, finalLat, finalLng, isSelected, onSelect, order, displayRate
}: {
  provider: any;
  finalLat: number;
  finalLng: number;
  isSelected: boolean;
  onSelect: () => void;
  order: any;
  displayRate: number;
}) {
  const { t } = useLanguage();
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
    if (isNew) return { text: t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' }), bg: '#F5F3FF', color: '#7C3AED', icon: '✦' };

    const badge = provider.badge?.toUpperCase() || 'CLASSIC';
    if (badge === 'ELITE') return { text: t({ en: 'ELITE', fr: 'ÉLITE', ar: 'نخبة' }), bg: '#FFF7ED', color: '#EA580C', icon: '🏆' };
    if (badge === 'PRO') return { text: t({ en: 'PRO', fr: 'PRO', ar: 'محترف' }), bg: '#F0FDF4', color: '#16A34A', icon: '💎' };
    return { text: t({ en: 'CLASSIC', fr: 'CLASSIQUE', ar: 'كلاسيكي' }), bg: '#F3F4F6', color: '#4B5563', icon: '🛡️' };
  };

  const rank = getRankBadge();

  useEffect(() => {
    const lat = (provider.isLive && provider.current_lat) ? provider.current_lat : provider.base_lat;
    const lng = (provider.isLive && provider.current_lng) ? provider.current_lng : provider.base_lng;
    if (!lat || !lng) return;
    getRoadDistance(finalLat, finalLng, lat, lng)
      .then(setRoadInfo);
  }, [provider.id, finalLat, finalLng, provider.isLive, provider.current_lat, provider.current_lng]);

  const isCarRental = order.serviceType === 'car_rental';
  const avatar = provider.avatarUrl || provider.avatar || provider.photoURL;

  return (
    <div
      onClick={onSelect}
      style={{
        border: isSelected ? '1px solid #01A083' : '1px solid #F3F4F6',
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

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', lineHeight: 1.2 }}>
              {provider.name}
            </div>
            {provider.isLive && provider.current_lat && (
              <div style={{
                background: '#F0FDF4', color: '#16A34A', fontSize: 9, fontWeight: 950,
                padding: '2px 6px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3,
                border: '1px solid #DCFCE7'
              }}>
                <div style={{ width: 4, height: 4, background: '#16A34A', borderRadius: '50%' }} />
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
            MAD {displayRate} <span style={{ color: '#9CA3AF', fontWeight: 500, fontSize: 10 }}>(min)</span>
            <div style={{ width: 14, height: 14, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={8} color="#fff" strokeWidth={4} />
            </div>
          </div>

          <span style={{
            background: rank.bg, color: rank.color,
            fontSize: 9, fontWeight: 950,
            padding: '2px 8px', borderRadius: 4,
            display: 'inline-flex', alignItems: 'center', gap: 2,
            alignSelf: 'flex-start',
            whiteSpace: 'nowrap'
          }}>
            <span>{rank.icon}</span> {rank.text}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Star size={12} fill="#FFC244" color="#FFC244" />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
              {provider.rating && Number(provider.rating) > 0 ? Number(provider.rating).toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 75 }}>
          <div style={{ height: 20 }}></div>

          {available && (
            <span style={{
              background: 'rgba(1, 160, 131, 0.05)',
              color: '#01A083',
              fontSize: 9, fontWeight: 950,
              padding: '4px 10px', borderRadius: 50,
              border: '1px solid rgba(1, 160, 131, 0.15)',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              textTransform: 'uppercase'
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#01A082' }}></span>
              {t({ en: 'AVAILABLE TODAY', fr: 'DISPONIBLE AUJOURD\'HUI', ar: 'متاح اليوم' })}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F9FAFB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 15, height: 15, borderRadius: '50%', border: '1.5px solid #9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={9} color="#9CA3AF" />
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 900 }}>
            {provider.taskCount || 0} {order.serviceName || (isCarRental ? t({ en: 'Car rental', fr: 'Location de voiture', ar: 'كراء سيارة' }) : t({ en: 'tasks', fr: 'missions', ar: 'مهام' }))}
          </span>
        </div>

        {roadInfo && (
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} /> {roadInfo.distanceKm} km · ~{roadInfo.durationMinutes} min
          </div>
        )}
      </div>

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

      {isSelected && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            marginTop: 18,
            width: '100%',
            background: '#01A083',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '14px',
            fontSize: 14,
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(1, 160, 131, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            zIndex: 50
          }}
        >
          {t({ en: 'Book Me', fr: 'Réserver', ar: 'احجز الآن' })}
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: 4, display: 'flex' }}>
            <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
          </div>
        </motion.button>
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
