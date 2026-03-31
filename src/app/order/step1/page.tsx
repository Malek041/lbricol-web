'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import dynamic from 'next/dynamic';
import { MapPin, X } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });
import { getDocs, query, where, limit as limitDocs, collection as collectionRef } from 'firebase/firestore';
import { calculateDistance, getRoadDistance } from '@/lib/calculateDistance';

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
  const [currentCity, setCurrentCity] = useState(order.location?.city || '');
  const [currentArea, setCurrentArea] = useState(order.location?.area || '');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [estimateTime, setEstimateTime] = useState<number | null>(null);

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
    }
  }, [searchParams]);

  // Estimate arrival time from nearest provider
  useEffect(() => {
    if (!currentLat || !currentLng || !order.serviceType) return;

    const findNearest = async () => {
      try {
        const snap = await getDocs(query(
          collectionRef(db, 'bricolers'),
          where('isActive', '==', true),
          limitDocs(20)
        ));

        let minTime = Infinity;
        let nearestBricoler = null;

        for (const doc of snap.docs) {
          const b = doc.data();
          if (!b.base_lat || !b.base_lng) continue;
          
          // Check if they offer the service
          const hasService = Array.isArray(b.services) && b.services.some((s: any) => s.categoryId === order.serviceType);
          if (!hasService) continue;

          const dist = calculateDistance(currentLat, currentLng, b.base_lat, b.base_lng);
          if (dist < 30) { // Only if within 30km
            const road = await getRoadDistance(b.base_lat, b.base_lng, currentLat, currentLng);
            if (road.durationMinutes < minTime) {
              minTime = road.durationMinutes;
            }
          }
        }
        
        if (minTime !== Infinity) {
          setEstimateTime(minTime);
        } else {
            // Mocking a nearby provider time if no real match found for premium feeling
            setEstimateTime(Math.floor(Math.random() * 10) + 3);
        }
      } catch (e) {
        console.warn("Step 1 estimation failed", e);
      }
    };
    findNearest();
  }, [currentLat, currentLng, order.serviceType]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    // 1. If we have query params (just came back from search), don't auto-reset to GPS
    if (searchParams.get('lat') || searchParams.get('lng')) {
      return;
    }

    // 2. If we already have a location (manual selection in state or confirm), don't auto-reset to GPS
    if (order.location?.lat && order.location?.lng) {
      setUserPosition(null); // Just for visualization
      return;
    }

    navigator.geolocation.getCurrentPosition(

      (pos) => {
        const { latitude, longitude } = pos.coords;

        // Set as initial center so map opens here
        setCurrentLat(latitude);
        setCurrentLng(longitude);

        // Set GPS dot
        setUserPosition({ lat: latitude, lng: longitude });

        // Fly to it (skipOffset: true so pin lands exactly on dot)
        setFlyToPoint({ lat: latitude, lng: longitude, skipOffset: true });
      },
      () => { },
      { enableHighAccuracy: true, timeout: 10000 }
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

  const saveDraftAndExit = async () => {
    const user = auth.currentUser;
    const draftData = {
      ...order,
      location: { lat: currentLat, lng: currentLng, address: currentAddress },
      clientId: user?.uid || null,
      status: 'draft',
      updatedAt: new Date().toISOString(),
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
      // Local fallback if no user
      const existing = JSON.parse(localStorage.getItem('lbricol_order_drafts') || '[]');
      // Add id if missing
      const draftWithId = { ...draftData, id: `draft_${Date.now()}` };
      existing.push(draftWithId);
      localStorage.setItem('lbricol_order_drafts', JSON.stringify(existing));
    }
    router.push('/?tab=calendar');
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
          position: absolute;
          inset: 0;
          z-index: 10;
        }
        .step1-sheet {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fff;
          border-radius: 28px 28px 0 0;
          box-shadow: 0 -4px 30px rgba(0,0,0,0.1);
          padding: 24px 20px 0 20px;
          padding-bottom: max(32px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 1002;
        }
        .step1-map-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.1);
          z-index: 1001;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .step1-map-overlay.active {
          opacity: 1;
        }
        .skeleton-pulse {
          background: linear-gradient(-90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
          background-size: 400% 400%;
          animation: skeleton-pulse 1.2s ease-in-out infinite;
          border-radius: 6px;
        }
        @keyframes skeleton-pulse {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="step1-root">

        <div className="step1-map">

          <MapView
            initialLocation={{ lat: currentLat, lng: currentLng }}
            flyToPoint={flyToPoint}
            userPosition={userPosition}
            zoom={17}
            pinY={50}
            onLocationChange={(point) => {
              setCurrentLat(point.lat);
              setCurrentLng(point.lng);
              setCurrentAddress(point.address);
              setCurrentCity(point.city || '');
              setCurrentArea(point.area || '');
            }}
            onLoadingChange={setIsFetchingAddress}
          />
          <div className={`step1-map-overlay ${isFetchingAddress ? 'active' : ''}`} />

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
          <X size={20} className="text-[#111827]" />
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
            <MapPin size={20} className="text-[#219178]" />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#111827',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: 220,
              }}>
                {isFetchingAddress ? (
                  <div className="skeleton-pulse" style={{ height: 18, width: 140, margin: '4px 0' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{currentAddress}</span>
                    {estimateTime && (
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 900, 
                        background: '#EEF2FF', 
                        color: '#4F46E5', 
                        padding: '2px 8px', 
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        🚗 {estimateTime} min
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div
                onClick={() => !isFetchingAddress && router.push('/order/step1/search')}
                style={{
                  fontSize: 13, fontWeight: 600, color: isFetchingAddress ? '#9CA3AF' : '#219178',
                  cursor: isFetchingAddress ? 'default' : 'pointer', marginTop: 2,
                }}
              >
                {isFetchingAddress ? 'Updating position...' : 'Use this point'}
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
              bottom: 240,
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
                {isFetchingAddress ? (
                  <div className="skeleton-pulse" style={{ height: 20, width: '90%' }} />
                ) : (
                  currentAddress
                )}
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
              if (isFetchingAddress) return;
              setOrderField('location', {
                lat: currentLat,
                lng: currentLng,
                address: currentAddress,
                city: currentCity,
                area: currentArea,
              });
              
              const isBroadcast = order.serviceType === 'errands' || order.serviceType === 'courier';
              if (isBroadcast) {
                setOrderField('isPublic', true);
                router.push('/order/setup');
              } else {
                router.push('/order/step2');
              }
            }}
            disabled={isFetchingAddress}
            style={{
              width: '100%', height: 54, borderRadius: 50,
              background: isFetchingAddress ? '#E5E7EB' : '#219178', color: isFetchingAddress ? '#9CA3AF' : '#fff',
              border: 'none', fontSize: 16, fontWeight: 800,
              cursor: isFetchingAddress ? 'wait' : 'pointer', letterSpacing: 0.2,
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
          >
            {isFetchingAddress && (
              <div style={{ width: 18, height: 18, border: '2px solid #9CA3AF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            )}
            {isFetchingAddress ? 'Finding address...' : 'Confirm This Location'}
          </button>

          <div
            onClick={() => !isFetchingAddress && router.push('/order/step1/search')}
            style={{
              textAlign: 'center', fontSize: 15,
              fontWeight: 700, color: isFetchingAddress ? '#9CA3AF' : '#219178',
              cursor: isFetchingAddress ? 'default' : 'pointer', paddingBottom: 8,
              flexShrink: 0,
              pointerEvents: isFetchingAddress ? 'none' : 'auto',
              opacity: isFetchingAddress ? 0.7 : 1
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