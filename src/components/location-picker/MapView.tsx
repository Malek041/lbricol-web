"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from './types';

export interface MapViewHandle {
  flyTo: (lat: number, lng: number, zoom?: number, options?: L.ZoomPanOptions) => void;
  flyToWithOffset: (lat: number, lng: number, zoom?: number) => void;
  locate: (onSuccess?: (lat: number, lng: number) => void, onError?: (error: any) => void) => void;
}

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
  interactive?: boolean;
  zoom?: number;
}

const MapView = React.forwardRef<MapViewHandle, MapViewProps>(({
  onLocationChange,
  initialLocation,
  triggerGps,
  flyToPoint,
  onInteractionStart,
  onInteractionEnd,
  pinY = 30, // Fixed height to avoid movement during sheet transitions
  centerOffset,
  language = 'en',
  interactive = true,
  zoom: requestedZoom
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<any>(null);
  const [address, setAddress] = useState<string>('Loading address...');
  const [mapReady, setMapReady] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  React.useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 17, options) => {
      const map = mapRef.current;
      if (!map || !map.getCenter) return;
      try {
        map.flyTo([lat, lng], zoom, options);
      } catch (e) {
        console.warn('flyTo called before map ready:', e);
      }
    },
    flyToWithOffset: (lat, lng, zoom = 17) => {
      flyToWithOffset(lat, lng, zoom);
    },
    locate: (onSuccess, onError) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const map = mapRef.current;
          if (!map || !map.getCenter) {
            onError?.('Map not ready');
            return;
          }

          map.flyTo([latitude, longitude], 17, { duration: 1.5 });

          // ✅ Restore blue GPS accuracy dot:
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            gpsMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              fillColor: '#3B82F6',
              color: '#ffffff',
              weight: 2,
              fillOpacity: 1,
            }).addTo(map);
          }

          reverseGeocode(latitude, longitude);
          onSuccess?.(latitude, longitude);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          onError?.(error);
        }
      );
    }
  }));

  const flyToWithOffset = (lat: number, lng: number, zoom = 17) => {
    const map = mapRef.current;
    if (!map || !map.getCenter) return; // ← guard: map not ready yet
    
    try {
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
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 400);
    } catch (e) {
      console.warn('flyTo called before map ready:', e);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    let finalAddress = "";
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr,ar,en`,
        { headers: { 'User-Agent': 'Lbricol/1.0' } }
      );
      const data = await res.json();
      if (!data || data.error) {
        finalAddress = `${lat.toFixed(3)}, ${lng.toFixed(3)}, Morocco`;
      } else {
        const a = data.address;
        const street = a.road || a.pedestrian || a.street || '';
        const number = a.house_number || '';
        const neighborhood = a.neighbourhood || a.suburb || '';
        const city = a.city || a.town || a.village || '';

        if (street) finalAddress = number ? `${street}, ${number}, ${city}` : `${street}, ${city}`;
        else if (neighborhood) finalAddress = `${neighborhood}, ${city}, Morocco`;
        else finalAddress = `${city}, Morocco`;
      }
    } catch {
      finalAddress = `${lat.toFixed(3)}, ${lng.toFixed(3)}, Morocco`;
    }

    setAddress(finalAddress);
    onLocationChange({ lat, lng, address: finalAddress });

    try {
      localStorage.setItem('lastKnownLat', lat.toString());
      localStorage.setItem('lastKnownLng', lng.toString());
    } catch (e) { }
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

    const zoom = requestedZoom || 16;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
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

    map.on('dragend', () => {
      onInteractionEnd?.();
    });

    // Center-pin logic: map moves, pin stays fixed
    map.on('moveend', () => {
      if (!map || !map.getCenter) return; // ← guard
      if (!interactive) return; // Don't re-geocode purely on load if static
      
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
});

export default MapView;
