'use client';
import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import dynamic from 'next/dynamic';
import { MapPin, X } from 'lucide-react';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });

function Step1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { order, setOrderField } = useOrder();

  const [currentAddress, setCurrentAddress] = useState(
    order.location?.address || 'Locating...'
  );
  const [currentLat, setCurrentLat] = useState(order.location?.lat || 33.5731);
  const [currentLng, setCurrentLng] = useState(order.location?.lng || -7.5898);
  const [flyToPoint, setFlyToPoint] = useState<{ lat: number; lng: number; skipOffset?: boolean } | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    const latStr = searchParams.get('lat');
    const lngStr = searchParams.get('lng');
    const address = searchParams.get('address');
    if (latStr && lngStr && address) {
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      setCurrentLat(lat);
      setCurrentLng(lng);
      setCurrentAddress(decodeURIComponent(address));
      setFlyToPoint({ lat, lng, skipOffset: false });
      hasInitializedRef.current = true; // Prevents GPS from overwriting search result
    }
  }, [searchParams]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // ALWAYS update the user radar dot:
        setUserPosition({ lat: latitude, lng: longitude });

        // ONLY fly/center if we haven't already searched/navigated back
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setCurrentLat(latitude);
          setCurrentLng(longitude);
          setFlyToPoint({ lat: latitude, lng: longitude, skipOffset: true });
        }
      },
      () => { },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) { setIsLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFlyToPoint({ lat: latitude, lng: longitude, skipOffset: true });
        setUserPosition({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
      <style>{`
        @keyframes pinBounce {
          0%, 100% { transform: translate(-50%, -100%); }
          50%       { transform: translate(-50%, -125%); }
        }
        @keyframes cardBounce {
          0%, 100% { transform: translate(-50%, calc(-100% - 70px)); }
          50%       { transform: translate(-50%, calc(-100% - 95px)); }
        }
        .step1-root {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          background: #fff;
          overflow: hidden;
        }
        .step1-map {
          flex: 1;
          position: relative;
          min-height: 0;
        }
        .step1-sheet {
          flex-shrink: 0;
          background: #fff;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          padding: 20px 20px 0 20px;
          padding-bottom: max(28px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 1002;
        }
      `}</style>

      <div className="step1-root">

        <div className="step1-map">

          <MapView
            initialLocation={{ lat: currentLat, lng: currentLng }}
            flyToPoint={flyToPoint}
            userPosition={userPosition}
            onLocationChange={(point) => {
              setCurrentLat(point.lat);
              setCurrentLng(point.lng);
              setCurrentAddress(point.address);
            }}
          />

          {/* X close button */}
          <button
            onClick={() => router.back()}
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

          {/* Address card — bounces with pin */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            zIndex: 999,
            background: '#fff',
            borderRadius: 14,
            padding: '12px 16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 200,
            maxWidth: '80%',
            animation: 'cardBounce 1.2s ease-in-out infinite',
            pointerEvents: 'auto',
          }}>
            <MapPin size={20} className="text-[#01A083]" />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#111827',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 220,
              }}>
                {currentAddress}
              </div>
              <div
                onClick={() => router.push('/order/step1/search')}
                style={{
                  fontSize: 13, fontWeight: 600, color: '#01A083',
                  cursor: 'pointer', marginTop: 2,
                }}
              >
                Use this point
              </div>
            </div>
          </div>

          {/* Bouncing branded pin */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            zIndex: 500,
            pointerEvents: 'none',
            animation: 'pinBounce 1.2s ease-in-out infinite',
          }}>
            <img
              src="/Images/map Assets/LocationPin.png"
              style={{ width: 50, height: 74, display: 'block' }}
              alt="pin"
            />
          </div>

          {/* My Location button */}
          <button
            onClick={handleLocateMe}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 1000,
              background: '#fff',
              border: 'none',
              borderRadius: 50,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#111827',
            }}
          >
            {isLocating ? (
              <span style={{ fontSize: 14 }}>⏳</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#2D3748" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            )}
            {isLocating ? 'Locating...' : 'My Location'}
          </button>

        </div>

        {/* Bottom sheet */}
        <div className="step1-sheet">

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: '#F3F4F6', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={22} className="text-neutral-500" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#111827',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {currentAddress}
              </div>
            </div>
            <button
              onClick={() => router.push('/order/step1/search')}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '1.5px solid #E5E7EB', background: '#fff',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#6B7280" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => {
              setOrderField('location', {
                lat: currentLat,
                lng: currentLng,
                address: currentAddress,
              });
              router.push('/order/step2');
            }}
            style={{
              width: '100%', height: 54, borderRadius: 50,
              background: '#01A083', color: '#fff',
              border: 'none', fontSize: 16, fontWeight: 800,
              cursor: 'pointer', letterSpacing: 0.2,
              flexShrink: 0,
            }}
          >
            Confirm This Location
          </button>

          <div
            onClick={() => router.push('/order/step1/search')}
            style={{
              textAlign: 'center', fontSize: 15,
              fontWeight: 700, color: '#01A083',
              cursor: 'pointer', paddingBottom: 8,
              flexShrink: 0,
            }}
          >
            Set Another address
          </div>

        </div>
      </div>
    </>
  );
}

export default function Step1Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Step1Content />
    </Suspense>
  );
}