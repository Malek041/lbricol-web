"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationPoint } from './types';

interface MapViewProps {
  onLocationChange: (point: LocationPoint) => void;
  initialLocation?: { lat: number; lng: number };
  triggerGps?: number;
  flyToPoint?: { lat: number; lng: number; skipOffset?: boolean };
  userPosition?: { lat: number; lng: number } | null;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  pinY?: number;
  centerOffset?: string;
  language?: string;
  interactive?: boolean;
  zoom?: number;
  providerPins?: Array<{
    id: string;
    lat: number;
    lng: number;
    rate: number;
    rating: number;
    avatarUrl?: string | null;
    isSelected: boolean;
  }>;
  focusedProviderId?: string | null;
  serviceIconUrl?: string; // e.g. from service category
}

const MapView: React.FC<MapViewProps> = ({
  onLocationChange,
  initialLocation,
  triggerGps,
  flyToPoint,
  userPosition,
  onInteractionStart,
  onInteractionEnd,
  pinY = 30,
  centerOffset,
  language = 'en',
  interactive = true,
  zoom: requestedZoom,
  providerPins,
  focusedProviderId,
  serviceIconUrl,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const gpsDotRef = useRef<L.CircleMarker | null>(null);
  const gpsPulseRef = useRef<L.CircleMarker | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const providerMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const [address, setAddress] = useState<string>('Loading address...');
  const [mapReady, setMapReady] = useState(false);
  const mapReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flyToWithOffset = (lat: number, lng: number, zoom = 17, skipOffset = false) => {
    if (!mapRef.current || !mapRef.current.getContainer()) return;
    const map = mapRef.current;

    if (skipOffset) {
      map.flyTo([lat, lng], zoom, { duration: 1.5 });
    } else {
      const mapSize = map.getSize();
      const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
      const targetPoint = L.point(mapSize.x / 2, mapSize.y * (pinY / 100));
      const targetLatLng = L.latLng(lat, lng);
      const centerLatLng = map.unproject(
        map.project(targetLatLng, zoom).add(centerPoint).subtract(targetPoint),
        zoom
      );
      map.flyTo(centerLatLng, zoom, { duration: 1.5 });
    }

    if (flyToTimeoutRef.current) clearTimeout(flyToTimeoutRef.current);
    flyToTimeoutRef.current = setTimeout(() => {
      if (mapRef.current && mapRef.current.getContainer()) {
        mapRef.current.invalidateSize();
      }
    }, 400);
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
      } catch (e) { }
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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    if (mapReadyTimeoutRef.current) clearTimeout(mapReadyTimeoutRef.current);
    mapReadyTimeoutRef.current = setTimeout(() => {
      if (mapRef.current && mapRef.current.getContainer()) {
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

    map.on('dragstart', () => { onInteractionStart?.(); });
    map.on('dragend', () => { onInteractionEnd?.(); });

    map.on('moveend', () => {
      if (!interactive) return;
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

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current && mapRef.current.getContainer()) {
        mapRef.current.invalidateSize();
      }
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapReadyTimeoutRef.current) clearTimeout(mapReadyTimeoutRef.current);
      if (flyToTimeoutRef.current) clearTimeout(flyToTimeoutRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Render userPosition as green radar dot ───────────────────────────
  useEffect(() => {
    if (!userPosition) return;

    const render = () => {
      const map = mapRef.current;
      if (!map) return;

      if (gpsDotRef.current) { map.removeLayer(gpsDotRef.current); gpsDotRef.current = null; }
      if (gpsPulseRef.current) { map.removeLayer(gpsPulseRef.current); gpsPulseRef.current = null; }
      if (gpsMarkerRef.current) { map.removeLayer(gpsMarkerRef.current); gpsMarkerRef.current = null; }

      const { lat, lng } = userPosition;

      const radarIcon = L.divIcon({
        className: 'gps-pulse-icon',
        html: `
          <div style="
            position: relative;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 20px; height: 20px;
              background: #10B981;
              border-radius: 50%;
              opacity: 0.4;
              animation: radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;
            "></div>
            <div style="
              position: absolute;
              width: 20px; height: 20px;
              background: #10B981;
              border-radius: 50%;
              opacity: 0.2;
              animation: radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;
              animation-delay: 1s;
            "></div>
            <div style="
              position: absolute;
              width: 12px; height: 12px;
              background: #10B981;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 1px 4px rgba(0,0,0,0.2);
              z-index: 10;
            "></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      gpsMarkerRef.current = L.marker([lat, lng], { icon: radarIcon }).addTo(map);
    };

    if (mapRef.current) {
      render();
    } else {
      const timer = setTimeout(render, 500);
      return () => clearTimeout(timer);
    }
  }, [userPosition]);

  useEffect(() => {
    if (triggerGps && navigator.geolocation && mapRef.current && mapReady) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          flyToWithOffset(latitude, longitude, 17, true);
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            reverseGeocode(latitude, longitude);
          }, 1000);
          if (gpsMarkerRef.current) {
            gpsMarkerRef.current.setLatLng([latitude, longitude]);
          } else if (mapRef.current) {
            const gpsIcon = L.divIcon({
              className: 'gps-pulse-icon',
              html: `
                <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;width:20px;height:20px;background:#10B981;border-radius:50%;opacity:0.4;animation:radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="position:absolute;width:20px;height:20px;background:#10B981;border-radius:50%;opacity:0.2;animation:radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;animation-delay:1s;"></div>
                  <div style="position:absolute;width:12px;height:12px;background:#10B981;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:10;"></div>
                </div>
              `,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
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
      flyToWithOffset(flyToPoint.lat, flyToPoint.lng, 17, flyToPoint.skipOffset ?? false);
    }
  }, [flyToPoint, mapReady]);

  // ── Render Center Confirmed Pin ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady || !initialLocation) return;
    const map = mapRef.current;

    if (centerMarkerRef.current) map.removeLayer(centerMarkerRef.current);

    const centerIcon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:48px;height:62px;animation:pinBounce 1.2s ease-in-out infinite;">
          <img src="/Images/map Assets/LocationPin.png" style="width:100%;height:100%" />
        </div>
      `,
      iconSize: [48, 62],
      iconAnchor: [24, 62],
    });

    centerMarkerRef.current = L.marker([initialLocation.lat, initialLocation.lng], { icon: centerIcon, zIndexOffset: 1000 }).addTo(map);

    return () => {
      if (centerMarkerRef.current) map.removeLayer(centerMarkerRef.current);
    };
  }, [initialLocation, mapReady]);

  // ── Render provider pins in Step 2 ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    Object.values(providerMarkersRef.current).forEach(m => map.removeLayer(m));
    providerMarkersRef.current = {};

    if (!providerPins || providerPins.length === 0) return;

    providerPins.forEach(pin => {
      const isFocused = pin.id === focusedProviderId;
      const size = isFocused ? 64 : 52;
      const opacity = isFocused ? 1 : 0.75;
      
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;opacity:${opacity};transition:all 0.3s ease;">
            <div style="background:white;border-radius:10px;padding:4px 10px;margin-bottom:4px;
              box-shadow:0 3px 10px rgba(0,0,0,0.18);font-family:sans-serif;text-align:center;white-space:nowrap;
              transform: scale(${isFocused ? 1.15 : 1}); transition: transform 0.3s;">
              <div style="font-size:12px;font-weight:800;color:#111827">${pin.rate} MAD</div>
              <div style="font-size:11px;color:#F59E0B;font-weight:700">★ ${pin.rating.toFixed(1)}</div>
            </div>
            <div style="position:relative;width:${size}px;height:${Math.round(size * 1.32)}px;transform: scale(${isFocused ? 1.15 : 1}); transition: transform 0.3s;">
              <img src="/Images/map Assets/locationPinYellow2.png" style="width:100%;height:100%;display:block" />
              <div style="position:absolute;top:10%;left:50%;transform:translateX(-50%);
                width:70%;height:53%;border-radius:50%;
                overflow:hidden;background:#fff;
                display:flex;align-items:center;justify-content:center;">
                ${serviceIconUrl 
                  ? `<img src="${serviceIconUrl}" style="width:80%;height:80%;object-fit:contain"/>`
                  : `<span style="font-size:16px">😊</span>`
                }
              </div>
            </div>
          </div>
        `,
        iconSize: [size + 60, size * 1.32 + 60],
        iconAnchor: [(size + 60) / 2, size * 1.32 + 32],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon, zIndexOffset: isFocused ? 2000 : 0 }).addTo(map);
      providerMarkersRef.current[pin.id] = marker;

      marker.on('click', () => {
        // We can handle click here if needed, but Step 2 uses scroll sync
      });
    });

    // Auto-fit bounds ONLY the first time or when entire list changes significantly
    // If just focusedId changed, don't refit to avoid jumping
  }, [providerPins, mapReady, focusedProviderId, serviceIconUrl]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <style jsx global>{`
        @keyframes radarPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(4); opacity: 0; }
        }
        .animate-radar-pulse {
          animation: radarPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-radar-pulse-delayed {
          animation: radarPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
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