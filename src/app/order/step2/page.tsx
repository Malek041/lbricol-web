'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateDistance } from '@/lib/calculateDistance';
import dynamic from 'next/dynamic';
import { X, Star, Clock, MapPin } from 'lucide-react';

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
           const distA = a.base_lat ? calculateDistance(clientLat, clientLng, a.base_lat, a.base_lng) : 999;
           const distB = b.base_lat ? calculateDistance(clientLat, clientLng, b.base_lat, b.base_lng) : 999;
           return distA - distB;
        });

        const finalProviders = sorted.length > 0 ? sorted : MOCK_PROVIDERS;
        setProviders(finalProviders);
        if (finalProviders.length > 0) setFocusedId(finalProviders[0].id);

      } catch (e) {
        console.error('Failed to load providers:', e);
        setProviders(MOCK_PROVIDERS);
        setFocusedId(MOCK_PROVIDERS[0].id);
      }
      setLoading(false);
    }
    load();
  }, [serviceType, clientLat, clientLng]);

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

  const handleSelect = (provider: any) => {
    setOrderField('providerId', provider.id);
    setOrderField('providerName', provider.name);
    setOrderField('providerRate', provider.minRate || 80);
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
        .step2-map {
          flex: 0.7; /* 70% MAP */
          position: relative;
          min-height: 0;
        }
        .step2-sheet {
          flex: 0.3; /* 30% SHEET */
          background: #fff;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          padding: 20px 0 0 0;
          padding-bottom: max(24px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          z-index: 1002;
          overflow: hidden;
        }
        .step2-cards {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 0 20px 16px;
          gap: 16px;
          -webkit-overflow-scrolling: touch;
        }
        .step2-cards::-webkit-scrollbar { display: none; }
        .provider-card-wrapper {
          flex: 0 0 85%;
          scroll-snap-align: center;
        }
      `}</style>

      <div className="step2-root">

        {/* ── MAP ── */}
        <div className="step2-map">
          <MapView
            initialLocation={{ lat: clientLat, lng: clientLng }}
            interactive={true}
            onLocationChange={() => {}}
            providerPins={providerPins}
            focusedProviderId={focusedId}
            serviceIconUrl={order.serviceIcon || undefined}
            centerAddress={order.location?.address || undefined}
            showCenterPin={true}
            onProviderClick={handleProviderClick}
          />

          {/* X close button */}
          <button
            onClick={() => router.push('/')}
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

          {/* Back button */}
          <button
            onClick={() => router.back()}
            style={{
              position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
              width: 36, height: 36, borderRadius: '50%',
              background: '#fff', border: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ‹
          </button>
        </div>

        {/* ── BOTTOM SHEET ── */}
        <div className="step2-sheet" style={{ height: '32vh' }}>

          {/* Title */}
          <div style={{
            fontSize: 16, fontWeight: 800, color: '#111827',
            marginBottom: 10, paddingLeft: 20,
          }}>
            Available Bricolers nearby
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
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Provider Card Component ──────────────────────────────────────────────────
function ProviderCard({
  provider, clientLat, clientLng, isSelected, onSelect, order
}: {
  provider: any;
  clientLat: number;
  clientLng: number;
  isSelected: boolean;
  onSelect: () => void;
  order: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const distance = provider.base_lat
    ? calculateDistance(clientLat, clientLng, provider.base_lat, provider.base_lng)
    : null;

  return (
    <div style={{
      border: isSelected ? '2px solid #01A083' : '1px solid #F3F4F6',
      borderRadius: 18,
      padding: '12px 14px',
      background: '#fff',
      transition: 'all 0.3s ease',
      boxShadow: isSelected ? '0 4px 12px rgba(1, 160, 131, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>

      {/* Main Info Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>

        {/* Left: Avatar & Availability */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: provider.avatarUrl ? 'transparent' : '#F3F4F6',
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, color: '#374151',
            border: '2px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            {provider.avatarUrl
              ? <img src={provider.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : provider.name?.charAt(0).toUpperCase()
            }
          </div>
          {provider.availableToday && (
            <span style={{
              background: '#F0FDF4', color: '#01A083',
              fontSize: 9, fontWeight: 700,
              padding: '2px 6px', borderRadius: 50,
              border: '1px solid #D1FAE5',
              whiteSpace: 'nowrap'
            }}>
              ● AVAILABLE TODAY
            </span>
          )}
        </div>

        {/* Center/Right Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 1 }}>
                {provider.name}
              </div>
              {provider.isNew && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#EEF2FF', color: '#6366F1',
                  fontSize: 9, fontWeight: 800,
                  padding: '1px 6px', borderRadius: 4, marginBottom: 4
                }}>
                  ✦ NEW
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>
                MAD {provider.minRate || 80} <span style={{fontSize: 9, color: '#6B7280', fontWeight: 400}}>(min)</span> <span style={{color: '#01A083'}}>✓</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 3 }}>
              ★ {(provider.rating || 5.0).toFixed(1)}
            </span>
            <span style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3 }}>
              ⏱ {provider.taskCount || 0} {order.serviceName || 'tasks'}
            </span>
          </div>
        </div>
      </div>

      {/* Bio / About */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <p style={{
          fontSize: 12, color: '#4B5563', lineHeight: 1.4,
          display: expanded ? 'block' : '-webkit-box',
          WebkitLineClamp: expanded ? undefined : 2,
          WebkitBoxOrient: 'vertical' as any,
          overflow: expanded ? 'visible' : 'hidden',
          marginBottom: 2,
        }}>
          {provider.aboutMe || provider.bio || 'Experienced Bricoler offering quality services in your area.'}
        </p>
        {(provider.bio?.length > 60 || !provider.bio) && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{
              color: '#01A083', fontSize: 11, fontWeight: 700,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginBottom: 4
            }}
          >
            {expanded ? 'Read Less' : 'Read More'}
          </button>
        )}
      </div>

      {/* Action */}
      <button
        onClick={onSelect}
        style={{
          width: '100%', height: 40,
          borderRadius: 10,
          background: '#01A083', color: '#fff',
          border: 'none', fontSize: 14, fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(1, 160, 131, 0.2)'
        }}
      >
        Select & Continue
      </button>
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
