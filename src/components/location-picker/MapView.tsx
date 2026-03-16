"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from './types';

interface MapViewProps {
  onLocationChange: (point: LocationPoint) => void;
  initialLocation?: { lat: number; lng: number };
  triggerGps?: number; // timestamp to trigger GPS
  flyToPoint?: { lat: number; lng: number }; // new prop
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  pinY?: number;
  centerOffset?: string;
  language?: string;
}

const MapView: React.FC<MapViewProps> = ({
  onLocationChange,
  initialLocation,
  triggerGps,
  flyToPoint,
  onInteractionStart,
  onInteractionEnd,
  pinY = 50,
  centerOffset,
  language = 'en'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');
  const [mapReady, setMapReady] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flyToWithOffset = (lat: number, lng: number, zoom = 17) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    const mapSize = map.getSize();
    const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
    const targetPoint = L.point(mapSize.x / 2, mapSize.y * (pinY / 100));
    
    const targetLatLng = L.latLng(lat, lng);
    const centerLatLng = map.unproject(
      map.project(targetLatLng, zoom).add(centerPoint).subtract(targetPoint),
      zoom
    );
    
    map.flyTo(centerLatLng, zoom, { duration: 1.5 });
    
    // Ensure map tiles load correctly after flying/resizing
    setTimeout(() => {
      map.invalidateSize();
    }, 400);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${language}`,
        {
          headers: {
            'User-Agent': 'Lbricol/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        const shortAddress = parts.slice(0, 3).join(', ');
        setAddress(shortAddress);
        onLocationChange({ lat, lng, address: shortAddress });
        
        // Save to avoid Essaouira fallback on next open
        try {
            localStorage.setItem('lastKnownLat', lat.toString());
            localStorage.setItem('lastKnownLng', lng.toString());
        } catch(e) {}
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

    // Use initialLocation, or last known, or Essaouira
    let lat = 31.5085;
    let lng = -9.7595;
    
    if (initialLocation) {
        lat = initialLocation.lat;
        lng = initialLocation.lng;
    } else {
        try {
            const lastLat = localStorage.getItem('lastKnownLat');
            const lastLng = localStorage.getItem('lastKnownLng');
            if (lastLat && lastLng) {
                lat = parseFloat(lastLat);
                lng = parseFloat(lastLng);
            }
        } catch (e) {}
    }

    const zoom = 16;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    // ✅ Clean, white/gray tiles (Positron style)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    // Set initial view with offset
    setTimeout(() => {
      if (mapRef.current) {
        const mapSize = mapRef.current.getSize();
        if (mapSize.x > 0) {
          const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
          const targetPoint = L.point(mapSize.x / 2, mapSize.y * (pinY / 100));
          const targetLatLng = L.latLng(lat, lng);
          const centerLatLng = mapRef.current.unproject(
            mapRef.current.project(targetLatLng, zoom).add(centerPoint).subtract(targetPoint),
            zoom
          );
          mapRef.current.setView(centerLatLng, zoom);
        } else {
          mapRef.current.setView([lat, lng], zoom);
        }
        setMapReady(true);
        reverseGeocode(lat, lng);
      }
    }, 50);

    // Interaction listeners - only on user drag to avoid loops from programmatic flyTo
    map.on('dragstart', () => {
      onInteractionStart?.();
    });

    map.on('zoomstart', () => {
      onInteractionStart?.();
    });

    // Center-pin logic: map moves, pin stays fixed
    map.on('moveend', () => {
      onInteractionEnd?.();
      
      const pinPoint = L.point(
        map.getSize().x / 2,
        map.getSize().y * (pinY / 100)
      );
      const center = map.containerPointToLatLng(pinPoint);

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        reverseGeocode(center.lat, center.lng);
      }, 800);
    });


    // Handle container resize (e.g. from height transition in parent)
    const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
            mapRef.current.invalidateSize();
        }
    });
    if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, []);

  // Shift map when pinY changes to keep the current location under the pin
  useEffect(() => {
    if (mapReady && mapRef.current) {
      const map = mapRef.current;
      const zoom = map.getZoom();
      
      const pinPoint = L.point(
        map.getSize().x / 2,
        map.getSize().y * (pinY / 100)
      );
      // This is the LatLng currently under the pin
      const currentLatLngUnderPin = map.containerPointToLatLng(pinPoint);
      
      // Now fly so this LatLng stays under the pin at the new position
      flyToWithOffset(currentLatLngUnderPin.lat, currentLatLngUnderPin.lng, zoom);
    }
  }, [pinY]);

  useEffect(() => {
    if (triggerGps && navigator.geolocation && mapRef.current && mapReady) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // ✅ SLOW animated fly with Pin offset
          flyToWithOffset(latitude, longitude, 17);
          
          // Force reverseGeocode to ensure parent components clear loading states
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            reverseGeocode(latitude, longitude);
          }, 1000);

          // ✅ GPS accuracy circle as separate marker with pulse effect
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setLatLng([latitude, longitude]);
          } else if (mapRef.current) {
            const gpsIcon = L.divIcon({
              className: 'gps-pulse-icon',
              html: `
                <div class="relative flex items-center justify-center w-5 h-5">
                  <div class="absolute w-3 h-3 bg-[#10B981] rounded-full z-10 border-[1.5px] border-white shadow-sm"></div>
                  <div class="absolute w-full h-full bg-[#10B981] rounded-full animate-radar-pulse opacity-40"></div>
                  <div class="absolute w-full h-full bg-[#10B981] rounded-full animate-radar-pulse-delayed opacity-20"></div>
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10], // Perfectly centered on the lat/lng
            });
            gpsMarkerRef.current = L.marker([latitude, longitude], { icon: gpsIcon }).addTo(mapRef.current);
          }
        },
        (error) => console.warn('Geolocation error:', error)
      );
    }
  }, [triggerGps, mapReady]);

  useEffect(() => {
    if (flyToPoint && mapRef.current && mapReady) {
      flyToWithOffset(flyToPoint.lat, flyToPoint.lng, 17);
    }
  }, [flyToPoint, mapReady]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      {/* Pin is now CSS-fixed in the parent component */}
      <style jsx global>{`
        @keyframes radar-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(5); opacity: 0; }
        }
        .animate-radar-pulse {
          animation: radar-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-radar-pulse-delayed {
          animation: radar-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          animation-delay: 1s;
        }
        .leaflet-container {
          background: #ffffffff !important;
        }
        .gps-pulse-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default MapView;
