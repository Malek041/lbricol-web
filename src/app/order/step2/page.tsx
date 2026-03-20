'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { calculateDistance } from '@/lib/calculateDistance';
import { matchScore } from '@/lib/matchBricolers';
import dynamic from 'next/dynamic';
import { X, Star, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { CAR_BRANDS } from '@/config/cars_config';
import { CarRentalProfileModal } from './CarRentalProfileModal';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });

// ── Mock providers for development (used when DB has no providers with GPS) ──
const MOCK_PROVIDERS = [
  {
    id: 'mock1',
    name: 'Mery Majjoud',
    avatarUrl: null,
    minRate: 80,
    rating: 0.0,
    taskCount: 20,
    bio: 'أتعامل مع الأطفال بلطف وصبر، وأهتم بسلامتهم ونظافتهم وأوفر لهم جواً مريحاً وآمناً.',
    isNew: true,
    availableToday: true,
    base_lat: 31.514,
    base_lng: -9.758,
    service_radius_km: 15,
  },
  {
    id: 'mock2',
    name: 'Khadija Dol',
    avatarUrl: null,
    minRate: 85,
    rating: 4.8,
    taskCount: 12,
    bio: 'مرحباً، أنا خديجة، لدي خبرة 5 سنوات في رعاية الأطفال والأنشطة التعليمية.',
    isNew: false,
    availableToday: true,
    base_lat: 31.511,
    base_lng: -9.762,
    service_radius_km: 15,
  },
  {
    id: 'mock3',
    name: 'Fatoma Ajroud',
    avatarUrl: null,
    minRate: 90,
    rating: 5.0,
    taskCount: 24,
    bio: 'أقدم خدمات رعاية الأطفال باحترافية عالية مع التركيز على الترفيه والتعليم.',
    isNew: false,
    availableToday: false,
    base_lat: 31.508,
    base_lng: -9.755,
    service_radius_km: 15,
  },
];

function Step2Content() {
  const router = useRouter();
  const { order, setOrderField } = useOrder();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);
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

        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Filter: must offer the selected service category
        const filtered = all.filter(b =>
          Array.isArray(b.services) &&
          b.services.some((s: any) => s.categoryId === serviceType)
        );

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

    if (user) {
      try {
        await addDoc(collection(db, 'jobs'), {
          ...draftData,
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
    rating: p.rating || 5.0,
    taskCount: p.taskCount || 0,
    avatarUrl: p.avatarUrl,
    isSelected: p.id === focusedId,
  }));

  const [viewedBricoler, setViewedBricoler] = useState<any>(null);

  const calculateRate = (provider: any) => {
    const isCarRental = order.serviceType === 'car_rental';
    const cars = provider.carRentalDetails?.cars || [];
    if (isCarRental && cars.length > 0) {
      return Math.min(...cars.map((c: any) => Number(c.pricePerDay || c.price || 9999)));
    }
    const serviceInfo = Array.isArray(provider.services)
      ? provider.services.find((s: any) => s.categoryId === order.serviceType)
      : null;
    return serviceInfo?.price || provider.minRate || 80;
  };

  const handleSelect = (provider: any) => {
    setFocusedId(provider.id);
    if (order.serviceType === 'car_rental') {
      setViewedBricoler(provider);
    } else {
      setOrderField('providerId', provider.id);
      setOrderField('providerName', provider.name);
      setOrderField('providerRate', calculateRate(provider));
      router.push('/order/step3');
    }
  };

  const handleModalSelect = (car: any, note: string, dates: any) => {
    setOrderField('providerId', viewedBricoler.id);
    setOrderField('providerName', viewedBricoler.name);
    setOrderField('providerRate', car.pricePerDay || car.price || calculateRate(viewedBricoler));
    setOrderField('selectedCar', car);
    setOrderField('carRentalNote', note);
    setOrderField('carRentalDates', dates);
    setOrderField('date', dates.pickupDate);
    setOrderField('time', dates.pickupTime);
    router.push('/order/step3');
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
          padding: 16px 0;
          padding-bottom: max(32px, env(safe-area-inset-bottom));
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
          flex: 0 0 90%;
          scroll-snap-align: center;
          height: 100%;
        }
      `}</style>

      <div className="step2-container">
        {/* ── MAP HEADER (FULL BACKGROUND) ── */}
        <div className="step2-map">
          <MapView
            initialLocation={{ lat: clientLat, lng: clientLng }}
            interactive={true}
            onLocationChange={() => {}}
            providerPins={providerPins}
            focusedProviderId={focusedId}
            serviceIconUrl={serviceType === 'car_rental' ? '/Images/Vectors Illu/carKey.png' : (order.serviceIcon || undefined)}
            showCenterPin={true}
            pinY={50}
            onProviderClick={handleProviderClick}
          />

          {/* X close button */}
          <button
            onClick={saveDraftAndExit}
            style={{
              position: 'absolute', top: 16, left: 16, zIndex: 1000,
              width: 36, height: 36, borderRadius: '50%',
              background: '#fff', border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>

        </div>

        {/* ── BOTTOM SHEET ── */}
        <div className="step2-sheet">

          {/* Title Row */}
          <div style={{
            display: 'flex', alignItems: 'center', 
            padding: '0 16px', marginBottom: 16,
            position: 'relative'
          }}>
            <button
              onClick={() => router.back()}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#fff', border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                cursor: 'pointer', fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2
              }}
            >
              ‹
            </button>
            
            <div style={{
              flex: 1,
              fontSize: 16, fontWeight: 900, color: '#111827',
              textAlign: 'center',
              textShadow: '0 1px 2px rgba(255,255,255,1)',
            }}>
              Available Bricolers nearby
            </div>
            <div style={{ width: 36 }}></div>
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
        </div>
        
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
  const [expanded, setExpanded] = useState(false);
  const distance = provider.base_lat
    ? calculateDistance(clientLat, clientLng, provider.base_lat, provider.base_lng)
    : null;

  const isCarRental = order.serviceType === 'car_rental';

  // Find specific service info
  const serviceInfo = Array.isArray(provider.services) 
    ? provider.services.find((s: any) => s.categoryId === order.serviceType)
    : null;

  const displayBio = serviceInfo?.description || provider.aboutMe || provider.bio || 'Experienced Bricoler offering quality services in your area.';

  return (
    <div 
      onClick={isCarRental ? onSelect : undefined}
      style={{
      border: isSelected ? '2px solid #01A083' : '1px solid #F3F4F6',
      borderRadius: 18,
      padding: '12px 14px',
      background: '#fff',
      transition: 'all 0.3s ease',
      boxShadow: isSelected ? '0 4px 12px rgba(1, 160, 131, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
      height: '100%',
      maxHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflowY: 'auto',
      overflowX: 'hidden',
      cursor: isCarRental ? 'pointer' : 'default'
    }}>

      {/* Main Info Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexShrink: 0 }}>

        {/* Left: Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            background: provider.avatarUrl ? 'transparent' : '#F3F4F6',
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: '#374151',
            border: '2px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            {provider.avatarUrl
              ? <img src={provider.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : provider.name?.charAt(0).toUpperCase()
            }
          </div>
        </div>

        {/* Center/Right Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 4, truncate: true } as any}>
                {provider.name}
              </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(124, 115, 232, 0.1)', color: '#7C73E8',
                    fontSize: 10, fontWeight: 900,
                    padding: '2px 8px', borderRadius: 6
                  }}>
                    <span style={{ fontSize: 11 }}>✦</span> { (provider.taskCount === 0 || provider.isNew) ? 'NEW' : (provider.badge ? provider.badge?.toUpperCase() : (provider.taskCount > 100 ? 'ELITE' : (provider.taskCount > 50 ? 'PRO' : 'CLASSIC'))) }
                  </span>
                {provider.availableToday && (
                   <span style={{
                    background: '#F0FDF4', color: '#01A082',
                    fontSize: 10, fontWeight: 900,
                    padding: '2px 8px', borderRadius: 50,
                    border: '1px solid #D1FAE5',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex', alignItems: 'center', gap: 4
                  }}>
                    <span style={{ fontSize: 10 }}>●</span> {order.language === 'ar' ? 'متاح اليوم' : 'AVAILABLE TODAY'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} strokeWidth={2.5} /> {provider.taskCount || 0} {order.serviceName || (isCarRental ? 'Car rental tasks' : 'tasks')}
                </span>
                {distance && (
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>
                    • {distance.toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>
                MAD {displayRate} <span style={{fontSize: 9, color: '#6B7280', fontWeight: 500}}>(min)</span>
              </div>
              {isSelected && (
                <div style={{ width: 18, height: 18, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={14} color="#fff" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bio / About */}
      <div style={{ flex: 1, marginTop: 8, padding: '0 4px' }}>
        <p style={{
          fontSize: 13, color: '#6B7280', lineHeight: 1.5, fontWeight: 600,
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? undefined : 2,
          WebkitBoxOrient: 'vertical' as any,
          overflow: expanded ? 'visible' : 'hidden',
          marginBottom: 4,
        }}>
          {displayBio}
        </p>
        {(displayBio.length > 80) && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{
              color: '#01A083', fontSize: 12, fontWeight: 800,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0
            }}
          >
            {expanded ? 'Read Less' : 'Read More'}
          </button>
        )}
      </div>

      {/* Brand Logo Strip */}
      {isCarRental && provider.carRentalDetails?.cars && provider.carRentalDetails.cars.length > 0 && (() => {
          const seenBrands = new Set<string>();
          const brands: { id: string; name: string; logo: string; totalCount: number }[] = [];
          
          provider.carRentalDetails.cars.forEach((car: any) => {
              if (!car.brandId || seenBrands.has(car.brandId)) return;
              seenBrands.add(car.brandId);
              const found = CAR_BRANDS.find(b => b.id === car.brandId);
              const sameBrandCars = provider.carRentalDetails.cars.filter((c: any) => c.brandId === car.brandId);
              
              brands.push({
                  id: car.brandId,
                  name: car.brandName || found?.name || car.brandId,
                  logo: found?.logo || '',
                  totalCount: sameBrandCars.reduce((acc: number, c: any) => acc + (c.quantity || 1), 0)
              });
          });
          
          if (brands.length === 0) return null;
          
          return (
              <div style={{ marginTop: 12, marginBottom: 4, overflowX: 'auto', display: 'flex', gap: 10 }} className="no-scrollbar">
                  {brands.map((brand) => (
                      <div key={brand.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                              {brand.logo
                                  ? <img src={brand.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={brand.name} />
                                  : <span style={{ fontSize: 9, fontWeight: 900, color: '#6B7280', textAlign: 'center' }}>{brand.name}</span>
                              }
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#4B5563', whiteSpace: 'nowrap' }}>{brand.name}</div>
                          <div style={{ fontSize: 9, fontWeight: 800, color: '#01A083' }}>{brand.totalCount}/{brand.totalCount} av.</div>
                      </div>
                  ))}
              </div>
          );
      })()}

      {/* Action */}
      {!isCarRental && (
        <button
          onClick={onSelect}
          style={{
            width: '100%', height: 42,
            borderRadius: 12,
            background: '#01A083', color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 900,
            cursor: 'pointer',
            marginTop: 8,
            boxShadow: '0 4px 12px rgba(1, 160, 131, 0.25)',
            flexShrink: 0
          }}
        >
          Select & Continue
        </button>
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
