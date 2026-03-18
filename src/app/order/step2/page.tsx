'use client';
import { useEffect, useState, Suspense } from 'react';
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
    rating: 3.5,
    taskCount: 0,
    bio: 'أتعامل مع الأطفال بلطف وصبر، وأهتم بسلامتهم ونظافتهم وأوفر لهم جواً مريحاً وآمناً.',
    isNew: true,
    availableToday: true,
    base_lat: 31.514,
    base_lng: -9.758,
    service_radius_km: 10,
  },
  {
    id: 'mock2',
    name: 'Nadia B.',
    avatarUrl: null,
    minRate: 80,
    rating: 3.5,
    taskCount: 0,
    bio: 'خبرة في رعاية الأطفال من جميع الأعمار.',
    isNew: true,
    availableToday: true,
    base_lat: 31.511,
    base_lng: -9.762,
    service_radius_km: 10,
  },
  {
    id: 'mock3',
    name: 'Sara M.',
    avatarUrl: null,
    minRate: 80,
    rating: 3.5,
    taskCount: 0,
    bio: 'متخصصة في خدمات المنزل مع خبرة 3 سنوات.',
    isNew: false,
    availableToday: true,
    base_lat: 31.508,
    base_lng: -9.755,
    service_radius_km: 10,
  },
];

function Step2Content() {
  const router = useRouter();
  const { order, setOrderField } = useOrder();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clientLat = order.location?.lat || 31.5085;
  const clientLng = order.location?.lng || -9.7595;
  const serviceType = order.serviceType || '';
  const subServiceId = order.subServiceId || '';

  // ── Fetch providers ──────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, 'bricolers'),
          where('isActive', '==', true),
          limit(100)
        ));

        const all = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Filter: must offer the selected service category
        const filtered = all.filter(b =>
          Array.isArray(b.services) &&
          b.services.some((s: any) => s.categoryId === serviceType)
        );

        // Filter: must have GPS and client must be within their radius
        const inRange = filtered.filter(b => {
          if (!b.base_lat || !b.base_lng) return true; // include if no GPS yet (MVP)
          const dist = calculateDistance(clientLat, clientLng, b.base_lat, b.base_lng);
          return dist <= (b.service_radius_km || 10);
        });

        // Sort: availableToday first, then by rating, then by distance
        const sorted = inRange.sort((a: any, b: any) => {
          const distA = a.base_lat ? calculateDistance(clientLat, clientLng, a.base_lat, a.base_lng) : 999;
          const distB = b.base_lat ? calculateDistance(clientLat, clientLng, b.base_lat, b.base_lng) : 999;
          const scoreA = (a.availableToday ? 40 : 0) + ((a.rating / 5) * 40) + (20 * (1 - Math.min(distA, 10) / 10));
          const scoreB = (b.availableToday ? 40 : 0) + ((b.rating / 5) * 40) + (20 * (1 - Math.min(distB, 10) / 10));
          return scoreB - scoreA;
        });

        setProviders(sorted.length > 0 ? sorted : MOCK_PROVIDERS);
      } catch (e) {
        console.error('Failed to load providers:', e);
        setProviders(MOCK_PROVIDERS);
      }
      setLoading(false);
    }
    load();
  }, [serviceType, clientLat, clientLng]);

  // ── Provider pin data for MapView ────────────────────────────────────
  const providerPins = providers.map(p => ({
    id: p.id,
    lat: p.base_lat || clientLat + (Math.random() - 0.5) * 0.015,
    lng: p.base_lng || clientLng + (Math.random() - 0.5) * 0.015,
    rate: p.minRate,
    rating: p.rating,
    avatarUrl: p.avatarUrl,
    isSelected: p.id === selectedId,
  }));

  const handleSelect = (provider: any) => {
    setOrderField('providerId', provider.id);
    setOrderField('providerName', provider.name);
    setOrderField('providerRate', provider.minRate);
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
          flex: 1;
          position: relative;
          min-height: 0;
        }
        .step2-sheet {
          flex-shrink: 0;
          background: #fff;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          padding: 20px 20px 0 20px;
          padding-bottom: max(28px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 0;
          z-index: 1002;
          max-height: 55vh;
          overflow: hidden;
        }
        .step2-cards {
          overflow-y: auto;
          flex: 1;
          padding-bottom: 16px;
          -webkit-overflow-scrolling: touch;
        }
        .step2-cards::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="step2-root">

        {/* ── MAP ── */}
        <div className="step2-map">
          <MapView
            initialLocation={{ lat: clientLat, lng: clientLng }}
            interactive={true}
            onLocationChange={() => {}}
            providerPins={providerPins}
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

          {/* Address card */}
          <div style={{
            position: 'absolute', top: 16, left: 64, right: 16, zIndex: 999,
            background: '#fff', borderRadius: 14, padding: '12px 16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 18 }}>🚲</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: '#111827',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {order.location?.address || 'Your location'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#01A083', marginTop: 2 }}>
                Use this point
              </div>
            </div>
          </div>

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
        <div className="step2-sheet">

          {/* Title */}
          <div style={{
            fontSize: 20, fontWeight: 800, color: '#111827',
            marginBottom: 16, flexShrink: 0,
          }}>
            Find your Tasker
          </div>

          {/* Provider cards */}
          <div className="step2-cards">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF', fontSize: 14 }}>
                Finding Bricolers near you...
              </div>
            ) : providers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>😔</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                  No Bricolers available yet
                </div>
                <div style={{ fontSize: 14, color: '#6B7280' }}>
                  We're expanding soon — check back shortly!
                </div>
              </div>
            ) : (
              providers.map(provider => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  clientLat={clientLat}
                  clientLng={clientLng}
                  isSelected={selectedId === provider.id}
                  onSelect={() => {
                    setSelectedId(provider.id);
                    handleSelect(provider);
                  }}
                />
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
  provider, clientLat, clientLng, isSelected, onSelect
}: {
  provider: any;
  clientLat: number;
  clientLng: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const distance = provider.base_lat
    ? calculateDistance(clientLat, clientLng, provider.base_lat, provider.base_lng)
    : null;

  return (
    <div style={{
      border: isSelected ? '2px solid #01A083' : '1px solid #F3F4F6',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      background: '#fff',
      transition: 'border-color 0.2s',
    }}>

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>

        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: provider.avatarUrl ? 'transparent' : '#E0F2FE',
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#0369A1',
        }}>
          {provider.avatarUrl
            ? <img src={provider.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : provider.name?.charAt(0).toUpperCase()
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + rate */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {provider.name}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
              MAD {provider.minRate}
              <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (min)</span>
              {' '}
              <span style={{ color: '#01A083' }}>✓</span>
            </span>
          </div>

          {/* NEW badge */}
          {provider.isNew && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#EEF2FF', color: '#6366F1',
              fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 50, marginTop: 4,
            }}>
              ✦ NEW
            </span>
          )}

          {/* Rating + availability */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 6,
          }}>
            <span style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 3 }}>
              ★ {(provider.rating || 0).toFixed(1)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {distance !== null && (
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {distance.toFixed(1)} km away
                </span>
              )}
              {provider.availableToday && (
                <span style={{
                  background: '#F0FDF4', color: '#01A083',
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 50,
                  border: '1px solid #A7F3D0',
                }}>
                  ● AVAILABLE TODAY
                </span>
              )}
            </div>
          </div>

          {/* Task count */}
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            ⏱ {provider.taskCount || 0} tasks completed
          </div>
        </div>
      </div>

      {/* Bio */}
      {provider.bio && (
        <div>
          <p style={{
            fontSize: 13, color: '#374151', lineHeight: 1.55,
            marginBottom: 4,
            display: expanded ? 'block' : '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 2,
            WebkitBoxOrient: 'vertical' as any,
            overflow: expanded ? 'visible' : 'hidden',
          }}>
            {provider.bio}
          </p>
          {provider.bio.length > 80 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                color: '#01A083', fontSize: 13, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, marginBottom: 10,
              }}
            >
              {expanded ? 'Show Less' : 'Read More'}
            </button>
          )}
        </div>
      )}

      {/* Select button */}
      <button
        onClick={onSelect}
        style={{
          width: '100%', height: 48, marginTop: 8,
          borderRadius: 50,
          background: '#01A083', color: '#fff',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', letterSpacing: 0.2,
        }}
      >
        Select &amp; Continue
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
