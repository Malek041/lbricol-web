'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import dynamic from 'next/dynamic';
import { MapPin, X } from 'lucide-react';

// Dynamically import map to avoid SSR crash
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
  const [flyToPoint, setFlyToPoint] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Read query params on mount to handle search result selection
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
      // Fly map to selected location via prop
      setFlyToPoint({ lat, lng });
    }
  }, [searchParams]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#fff',
    }}>

      {/* ── MAP (40vh) ── */}
      <div style={{ height: '40vh', flexShrink: 0, position: 'relative' }}>

        <MapView
          initialLocation={{ lat: currentLat, lng: currentLng }}
          flyToPoint={flyToPoint}
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
            cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* Address card — top of map */}
        <div style={{
          position: 'absolute', top: 16, left: 64, right: 16, zIndex: 999,
          background: '#fff', borderRadius: 14, padding: '12px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <MapPin size={20} className="text-[#00A082]" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: '#111827',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {currentAddress}
            </div>
            <div
              onClick={() => router.push('/order/step1/search')}
              style={{ fontSize: 13, fontWeight: 600, color: '#10B981', cursor: 'pointer', marginTop: 2 }}
            >
              Use this point
            </div>
          </div>
        </div>
        
        {/* Fixed Center Pin overlay */}
        <div 
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            zIndex: 1001,
            pointerEvents: 'none'
          }}
        >
          <div className="relative flex flex-col items-center">
            <div className="w-10 h-10 bg-[#FFB700] rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <span className="text-[20px]">😊</span>
            </div>
            <div className="w-1 h-4 bg-[#FFB700] -mt-1 shadow-md"></div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM SHEET (60vh) ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '24px 24px 0 0',
        background: '#fff',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        padding: '24px 20px 36px',
        zIndex: 1002
      }}>

        {/* Selected address row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#F3F4F6', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
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
          {/* Edit button */}
          <button
            onClick={() => router.push('/order/step1/search')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1.5px solid #E5E7EB', background: '#fff',
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✏️
          </button>
        </div>

        {/* Confirm This Location button */}
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
            width: '100%', height: 56, borderRadius: 50,
            background: '#10B981', color: '#fff',
            border: 'none', fontSize: 16, fontWeight: 800,
            cursor: 'pointer', marginBottom: 16,
            letterSpacing: 0.2,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}
        >
          Confirm This Location
        </button>

        {/* Set Another address */}
        <div
          onClick={() => router.push('/order/step1/search')}
          style={{
            textAlign: 'center', fontSize: 15,
            fontWeight: 700, color: '#10B981', cursor: 'pointer',
          }}
        >
          Set Another address
        </div>

      </div>
    </div>
  );
}

export default function Step1Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Step1Content />
    </Suspense>
  );
}
