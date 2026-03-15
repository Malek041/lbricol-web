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
}

const MapView: React.FC<MapViewProps> = ({
  onLocationChange,
  initialLocation,
  triggerGps,
  flyToPoint,
  onInteractionStart,
  onInteractionEnd,
  pinY = 50,
  centerOffset
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');
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
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
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
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = initialLocation
      ? [initialLocation.lat, initialLocation.lng]
      : [31.5085, -9.7595]; // Essaouira fallback

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 16, // ✅ Default zoom 16
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

    // Interaction listeners
    map.on('movestart', () => {
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

    // Initial geocode
    reverseGeocode(defaultCenter[0], defaultCenter[1]);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (triggerGps && navigator.geolocation && mapRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // ✅ SLOW animated fly with Pin offset
          flyToWithOffset(latitude, longitude, 17);

          // ✅ GPS accuracy circle as separate marker with pulse effect
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setLatLng([latitude, longitude]);
          } else if (mapRef.current) {
            const gpsIcon = L.divIcon({
              className: 'gps-pulse-icon',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-3 h-3 bg-[#10B981] rounded-full z-10 border-[1.5px] border-white shadow-sm"></div>
                  <div class="absolute w-3 h-3 bg-[#10B981] rounded-full animate-radar-pulse opacity-40"></div>
                  <div class="absolute w-3 h-3 bg-[#10B981] rounded-full animate-radar-pulse-delayed opacity-20"></div>
                </div>
              `,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
            gpsMarkerRef.current = L.marker([latitude, longitude], { icon: gpsIcon }).addTo(mapRef.current);
          }
        },
        (error) => console.warn('Geolocation error:', error)
      );
    }
  }, [triggerGps]);

  useEffect(() => {
    if (flyToPoint && mapRef.current) {
      flyToWithOffset(flyToPoint.lat, flyToPoint.lng, 17);
    }
  }, [flyToPoint]);

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
