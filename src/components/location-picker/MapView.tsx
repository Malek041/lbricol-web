"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
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
    taskCount: number;
    avatarUrl?: string | null;
    isSelected: boolean;
  }>;
  broadcastPins?: Array<{
    id: string;
    lat: number;
    lng: number;
    price: number | string;
    rating: number;
    serviceIcon: string;
    isSelected: boolean;
  }>;
  focusedProviderId?: string | null;
  focusedOrderId?: string | null;
  serviceIconUrl?: string; // e.g. from service category
  centerAddress?: string;
  showCenterPin?: boolean;
  onProviderClick?: (id: string) => void;
  onOrderClick?: (id: string) => void;
  onLocationError?: (error: any) => void;
  onLoadingChange?: (isLoading: boolean) => void; // New callback for fetching state
  lockCenterOnFocus?: boolean;  // When true, do NOT auto-fly to focused provider pin
  disableFitBounds?: boolean;   // When true, do NOT auto-fit map to all provider pins
  clientPin?: { lat: number; lng: number }; // When set, place a fixed Leaflet marker (Step 2)
  currentUserPin?: {
    lat?: number;
    lng?: number;
    avatarUrl?: string | null;
  };
  destinationPin?: { lat: number; lng: number };
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
  centerAddress,
  showCenterPin = false,
  onProviderClick,
  broadcastPins,
  focusedOrderId,
  onOrderClick,
  onLocationError,
  onLoadingChange,
  lockCenterOnFocus = false,
  disableFitBounds = false,
  clientPin,
  currentUserPin,
  destinationPin,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const gpsDotRef = useRef<L.CircleMarker | null>(null);
  const gpsPulseRef = useRef<L.CircleMarker | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeLabelRef = useRef<L.Marker | null>(null);
  const providerMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const clientPinMarkerRef = useRef<L.Marker | null>(null); // Fixed Leaflet marker for Step 2
  const [address, setAddress] = useState<string>('Loading address...');
  const [mapReady, setMapReady] = useState(false);
  const [internalUserPos, setInternalUserPos] = useState<{ lat: number, lng: number } | null>(null);

  const targetZoom = requestedZoom || 15;
  const mapReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flyToWithOffset = (lat: number, lng: number, zoom?: number, skipOffset = false) => {
    if (!mapRef.current || !mapRef.current.getContainer()) return;
    const map = mapRef.current;

    // If zoom is not provided, use current map zoom to prevent resets
    const targetZoom = zoom !== undefined ? zoom : map.getZoom();

    if (skipOffset) {
      map.flyTo([lat, lng], targetZoom, { duration: 1.5 });
    } else {
      const mapSize = map.getSize();
      const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
      const targetPoint = L.point(mapSize.x / 2, mapSize.y * (pinY / 100));
      const targetLatLng = L.latLng(lat, lng);
      const centerLatLng = map.unproject(
        map.project(targetLatLng, targetZoom).add(centerPoint).subtract(targetPoint),
        targetZoom
      );
      map.flyTo(centerLatLng, targetZoom, { duration: 1.5 });
    }

    if (flyToTimeoutRef.current) clearTimeout(flyToTimeoutRef.current);
    flyToTimeoutRef.current = setTimeout(() => {
      if (mapRef.current && mapRef.current.getContainer()) {
        mapRef.current.invalidateSize();
      }
    }, 400);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    onLoadingChange?.(true);
    let finalAddress = "";
    let city = "";
    let area = "";

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr,ar,en`,
        { headers: { 'User-Agent': 'Lbricol/1.0' } }
      );
      const data = await res.json();
      if (!data || data.error) {
        finalAddress = "Custom Location, Morocco";
      } else {
        const a = data.address;
        const street = a.road || a.pedestrian || a.street || '';
        const number = a.house_number || '';
        const neighborhood = a.neighbourhood || a.suburb || '';
        const cityName = a.city || a.town || a.village || '';

        city = cityName;
        area = neighborhood;

        if (street) finalAddress = number ? `${street}, ${number}, ${cityName}` : `${street}, ${cityName}`;
        else if (neighborhood) finalAddress = `${neighborhood}, ${cityName}, Morocco`;
        else finalAddress = `${cityName}, Morocco`;
      }
    } catch {
      finalAddress = "Custom Location, Morocco";
    }
    setAddress(finalAddress);
    onLocationChange({
      lat,
      lng,
      address: finalAddress,
      city: city || undefined,
      area: area || undefined
    });
    onLoadingChange?.(false);
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

    const zoom = targetZoom;

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
    map.on('touchstart', () => { onInteractionStart?.(); });
    map.on('touchend', () => { onInteractionEnd?.(); });

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

  // ── Watch internal user position if permitted ───────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setInternalUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // ── Render userPosition as green radar dot ───────────────────────────
  useEffect(() => {
    const activePos = currentUserPin?.lat ? { lat: currentUserPin.lat, lng: currentUserPin.lng! } : (userPosition || internalUserPos);
    if (!activePos) return;

    const render = () => {
      const map = mapRef.current;
      if (!map) return;

      if (gpsMarkerRef.current) { map.removeLayer(gpsMarkerRef.current); gpsMarkerRef.current = null; }

      const { lat, lng } = activePos;
      const avatar = currentUserPin?.avatarUrl;

      const radarIcon = L.divIcon({
        className: 'gps-pulse-icon',
        html: `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 40px; height: 40px; background: #10B981; border-radius: 50%; opacity: 0.3; animation: radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            ${avatar ? `
              <div style="position: relative; width: 34px; height: 34px; background: white; border: 2px solid white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.25); z-index: 10; overflow: hidden; display: flex; items-center; justify-center;">
                <img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : `
              <div style="position: absolute; width: 20px; height: 20px; background: #10B981; border-radius: 50%; opacity: 0.2; animation: radarPulse 2s cubic-bezier(0,0,0.2,1) infinite; animation-delay: 1s;"></div>
              <div style="position: absolute; width: 12px; height: 12px; background: #10B981; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); z-index: 10;"></div>
            `}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      gpsMarkerRef.current = L.marker([lat, lng], { icon: radarIcon, zIndexOffset: 4500 }).addTo(map);
    };

    if (mapRef.current) {
      render();
    } else {
      const timer = setTimeout(render, 500);
      return () => clearTimeout(timer);
    }
  }, [userPosition, internalUserPos, currentUserPin, mapReady]);

  useEffect(() => {
    if (triggerGps && navigator.geolocation && mapRef.current && mapReady) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          flyToWithOffset(latitude, longitude, targetZoom, pinY === 50);

          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            reverseGeocode(latitude, longitude);
          }, 1000);

          // Safety: if map doesn't move significantly, moveend might not fire
          // so we force a geocode update after 2s to clear any loading states
          setTimeout(() => {
            if (mapRef.current) reverseGeocode(latitude, longitude);
          }, 2000);

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
        (error) => {
          console.warn('Geolocation error:', error);
          onLocationError?.(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );
    }
  }, [triggerGps, mapReady]);

  useEffect(() => {
    if (flyToPoint && mapRef.current && mapReady) {
      flyToWithOffset(flyToPoint.lat, flyToPoint.lng, targetZoom, flyToPoint.skipOffset ?? false);
    }
  }, [flyToPoint, mapReady]);

  // ── Render Center Confirmed Pin with Address Bubble (DEPRECATED: Using CSS Overlay) ──
  /*
  useEffect(() => {
    if (!showCenterPin) return;
    ...
  }, [initialLocation, mapReady, centerAddress, showCenterPin, userPosition, internalUserPos]);
  */

  // ── Render provider pins in Step 2 ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    Object.values(providerMarkersRef.current).forEach(m => map.removeLayer(m));
    providerMarkersRef.current = {};

    if (!providerPins || providerPins.length === 0) return;

    providerPins.forEach(pin => {
      const isFocused = pin.id === focusedProviderId;
      const hasFocus = !!focusedProviderId;
      const opacity = hasFocus && !isFocused ? 0.6 : 1;
      const scale = hasFocus && !isFocused ? 0.8 : (isFocused ? 1.15 : 1);
      const size = isFocused ? 72 : 56;

      const bounceStyle = isFocused ? "animation: pinBounce 2s ease-in-out infinite;" : "";

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:160px;cursor:pointer;opacity:${opacity};transform:scale(${scale});transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);${bounceStyle}">
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
              <div style="background:#fff;border-radius:12px;padding:10px 16px; 
                box-shadow:0 8px 18px rgba(0,0,0,0.15);font-family:sans-serif;text-align:center;white-space:nowrap;
                display: flex; flex-direction: column; align-items: center; border: 1px solid #f3f4f6; position: relative; z-index: 10;">
                <div style="font-size:16px;font-weight:950;color:#111827">${pin.taskCount || 0} Jobs</div>
                <div style="font-size:20px;color:#111827;font-weight:950;display:flex;align-items:center;gap:6px;margin-top:2px;">
                  <span style="color:#FBBF24;font-size:24px;">★</span> ${!pin.taskCount || pin.taskCount === 0 ? '0.0' : (pin.rating || 0).toFixed(1)}
                </div>
              </div>
              <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid white; margin-top: -1px; z-index: 5; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.05));"></div>
            </div>
            <div style="position:relative;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;flex-shrink:0;transition: width 0.3s, height 0.3s; margin-bottom: 0px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; background: #fff;">
              ${pin.avatarUrl
                ? `<img src="${pin.avatarUrl}" style="width:100%;height:100%;object-fit:cover"/>`
                : `<div style="width:100%;height:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>`
              }
            </div>
          </div>
        `,
        iconSize: [120, 160],
        iconAnchor: [60, 160],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon, zIndexOffset: isFocused ? 2000 : 0 })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onProviderClick?.(pin.id);
        });

      providerMarkersRef.current[pin.id] = marker;
    });

    // Removed fitBounds from here to prevent zoom resets on focus changes
  }, [providerPins, mapReady, focusedProviderId, serviceIconUrl, onProviderClick]);

  // ── Fixed client pin marker for Step 2 (moves with map, always over GPS dot) ──
  useEffect(() => {
    if (!clientPin || !mapRef.current || !mapReady) return;
    const map = mapRef.current;

    // Remove any previous marker
    if (clientPinMarkerRef.current) {
      map.removeLayer(clientPinMarkerRef.current);
      clientPinMarkerRef.current = null;
    }

    const html = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:140px; pointer-events:none;">
        ${centerAddress ? `
          <div style="background:white; border:1px solid #f3f4f6; border-radius:18px; padding:10px 16px; margin-bottom:8px; box-shadow:0 10px 25px rgba(0,0,0,0.1); display:flex; items-center; gap:12px; white-space:nowrap; position:relative;">
            <div style="width:32px; height:32px; border-radius:50%; background:#ecfdf5; display:flex; align-items:center; justify-content:center; font-size:18px;">🚲</div>
            <div style="display:flex; flex-direction:column; justify-content:center;">
              <div style="font-size:13px; font-weight:900; color:#111827; line-height:1; margin-bottom:4px; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${centerAddress}</div>
              <div style="font-size:11px; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.05em;">Secteur de recherche</div>
            </div>
            <div style="position:absolute; bottom:-6px; left:50%; margin-left:-6px; width:12px; height:12px; background:white; border-right:1px solid #f3f4f6; border-bottom:1px solid #f3f4f6; transform:rotate(45deg);"></div>
          </div>
        ` : ''}
        <img src="/Images/map Assets/LocationPin.png" style="width:38px; height:50px; object-fit:contain; display:block;" alt="Your location" />
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html,
      iconSize: [240, 140],
      iconAnchor: [120, 140], // bottom center of the container (tip of the pin)
    });

    clientPinMarkerRef.current = L.marker([clientPin.lat, clientPin.lng], {
      icon,
      zIndexOffset: 5000,
      interactive: false,
    }).addTo(map);
  }, [clientPin?.lat, clientPin?.lng, mapReady, centerAddress]);

  // ── Render broadcast pins (Orders) ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    // Use a separate collection for broadcast markers if needed, or clear appropriately
    // For simplicity, we can use providerMarkersRef or a new one
    // Let's use a new one: broadcastMarkersRef

    if (!broadcastPins || broadcastPins.length === 0) return;

    broadcastPins.forEach(pin => {
      const isFocused = pin.id === focusedOrderId;
      const opacity = focusedOrderId && !isFocused ? 0.6 : 1;
      const scale = focusedOrderId && !isFocused ? 0.8 : (isFocused ? 1.15 : 1);
      const size = isFocused ? 72 : 56;

      const bounceStyle = isFocused ? "animation: pinBounce 2s ease-in-out infinite;" : "";

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:160px;cursor:pointer;opacity:${opacity};transform:scale(${scale});transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);${bounceStyle}">
            <div style="background:#fff;border-radius:12px;padding:6px 12px;margin-bottom:6px;
              box-shadow:0 4px 15px rgba(0,0,0,0.18);font-family:sans-serif;text-align:center;white-space:nowrap;
              display: flex; flex-direction: column; align-items: center; border: 1px solid #f3f4f6;">
              <div style="font-size:14px;font-weight:900;color:#219178">${pin.price} MAD</div>
              <div style="font-size:13px;color:#FBBF24;font-weight:900;display:flex;align-items:center;gap:3px;">
                ★ <span style="color:#111827">${pin.rating.toFixed(1)}</span>
              </div>
            </div>
            <div style="position:relative;width:${size}px;height:${size}px;transition: width 0.3s, height 0.3s; margin-bottom: 0px; background: #fff; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 8px;">
              <img src="${pin.serviceIcon}" style="width:100%;height:100%;object-fit:contain"/>
            </div>
          </div>
        `,
        iconSize: [120, 160],
        iconAnchor: [60, 160],
      });

      L.marker([pin.lat, pin.lng], { icon, zIndexOffset: isFocused ? 2000 : 0 })
        .addTo(map)
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onOrderClick?.(pin.id);
        });
    });
  }, [broadcastPins, mapReady, focusedOrderId, onOrderClick]);

  // ── Auto-zoom to focused provider (disabled when lockCenterOnFocus=true) ────
  useEffect(() => {
    if (lockCenterOnFocus) return; // Step 2: keep map centred on client address
    if (!mapRef.current || !mapReady || !focusedProviderId || !providerPins) return;
    const focusPin = providerPins.find(p => p.id === focusedProviderId);
    if (focusPin) {
      flyToWithOffset(focusPin.lat, focusPin.lng, targetZoom, false);
    }
  }, [focusedProviderId, mapReady, lockCenterOnFocus]);

  // ── Render route between client and focused provider ──────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady || !focusedProviderId || !initialLocation) {
      if (routeLayerRef.current) { mapRef.current?.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
      if (routeLabelRef.current) { mapRef.current?.removeLayer(routeLabelRef.current); routeLabelRef.current = null; }
      return;
    }
    const map = mapRef.current;

    const focusPin = providerPins?.find(p => p.id === focusedProviderId);
    if (!focusPin) return;

    const start = [initialLocation.lng, initialLocation.lat];
    const end = [focusPin.lng, focusPin.lat];

    const loadRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`);
        const data = await res.json();

        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        if (routeLabelRef.current) map.removeLayer(routeLabelRef.current);

        if (data.code === 'Ok' && data.routes?.[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const durationMin = Math.round(route.duration / 60);

          routeLayerRef.current = L.polyline(coords, {
            color: '#219178',
            weight: 6,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Find midpoint index for the time bubble
          const midIdx = Math.floor(coords.length / 2);
          const midPoint = coords[midIdx];

          const labelIcon = L.divIcon({
            className: '',
            html: `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                <div style="
                  background: #219178; 
                  padding: 8px 14px; 
                  border-radius: 8px; 
                  box-shadow: 0 4px 15px rgba(0,160,130,0.3); 
                  display: flex; 
                  align-items: center; 
                  gap: 6px;
                  white-space: nowrap;
                  color: white;
                  animation: fadeIn 0.3s ease-out;
                  z-index: 1000;
                  position: relative;
                ">
                  <span style="font-size: 13px; font-weight: 950; letter-spacing: 0.3px">${durationMin} min</span>
                </div>
                <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #219178; margin-top: -1px; z-index: 999;"></div>
              </div>
            `,
            iconSize: [120, 50],
            iconAnchor: [60, 50],
          });
          routeLabelRef.current = L.marker(midPoint, { 
            icon: labelIcon, 
            zIndexOffset: 3000 
          }).addTo(map);

        } else {
          // Fallback to straight line if OSRM fails
          routeLayerRef.current = L.polyline([[initialLocation.lat, initialLocation.lng], [focusPin.lat, focusPin.lng]], {
            color: '#3B82F6', weight: 4, opacity: 0.6, dashArray: '8, 8'
          }).addTo(map);
        }
      } catch (e) {
        console.warn("Routing failed", e);
      }
    };

    loadRoute();

    return () => {
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      if (routeLabelRef.current) map.removeLayer(routeLabelRef.current);
    };
  }, [focusedProviderId, initialLocation, mapReady, providerPins]);

  // ── Render route between clientPin and destinationPin (Moving / Errands) ──
  useEffect(() => {
    if (!mapRef.current || !mapReady || !clientPin || !destinationPin) {
      // Don't clear if focusedProviderId and clientPin are still active (handled by previous effect)
      // but if we are specifically using clientPin/destinationPin, we might want to clear old ones.
      if (!focusedProviderId) {
        if (routeLayerRef.current) { mapRef.current?.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
        if (routeLabelRef.current) { mapRef.current?.removeLayer(routeLabelRef.current); routeLabelRef.current = null; }
      }
      return;
    }
    const map = mapRef.current;

    const start = [clientPin.lng, clientPin.lat];
    const end = [destinationPin.lng, destinationPin.lat];

    const loadDirectRoute = async () => {
      try {
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`);
        const data = await res.json();

        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        if (routeLabelRef.current) map.removeLayer(routeLabelRef.current);

        if (data.code === 'Ok' && data.routes?.[0]) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
          const durationMin = Math.round(route.duration / 60);

          routeLayerRef.current = L.polyline(coords, {
            color: '#219178', // Branded color for the order route
            weight: 7,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Find midpoint index for the time bubble
          const midIdx = Math.floor(coords.length / 2);
          const midPoint = coords[midIdx];

          const labelIcon = L.divIcon({
            className: '',
            html: `
              <div style="
                background: white; 
                padding: 6px 12px; 
                margin-bottom: 2px;
                border-radius: 50px; 
                box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
                display: flex; 
                align-items: center; 
                gap: 6px;
                white-space: nowrap;
                border: 2px solid #219178;
                animation: fadeIn 0.3s ease-out;
                pointer-events: none;
              ">
                <span style="font-size: 14px">⚡</span>
                <span style="font-size: 13px; font-weight: 800; color: #111827">${durationMin} min</span>
              </div>
            `,
            iconSize: [100, 40],
            iconAnchor: [50, 60],
          });

          routeLabelRef.current = L.marker(midPoint, { icon: labelIcon, zIndexOffset: 3000 }).addTo(map);

          // Auto-fit if requested, or at least fit the route
          const bounds = L.latLngBounds(coords);
          map.fitBounds(bounds, { padding: [40, 40] });

        } else {
          routeLayerRef.current = L.polyline([[clientPin.lat, clientPin.lng], [destinationPin.lat, destinationPin.lng]], {
            color: '#219178', weight: 4, opacity: 0.6, dashArray: '8, 8'
          }).addTo(map);
        }
      } catch (e) {
        console.warn("Direct routing failed", e);
      }
    };

    loadDirectRoute();

    return () => {
      if (!focusedProviderId) {
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        if (routeLabelRef.current) map.removeLayer(routeLabelRef.current);
      }
    };
  }, [clientPin, destinationPin, mapReady, focusedProviderId]);

  // ── Auto-fit bounds ONLY when the LIST of providers changes ────────────────
  useEffect(() => {
    if (disableFitBounds) return; // Step 2: keep map locked on client address
    if (!mapRef.current || !mapReady || !providerPins || providerPins.length === 0) return;
    const map = mapRef.current;

    const allPoints: L.LatLngTuple[] = [
      [initialLocation!.lat, initialLocation!.lng],
      ...providerPins.map(p => [p.lat, p.lng] as L.LatLngTuple)
    ];
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [100, 100], animate: true });
  }, [providerPins?.length, mapReady, disableFitBounds]); // Dependency on length/exists, not focus

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* CSS-based Branded Center Pin */}
      {showCenterPin && (
        <div
          className="absolute left-1/2 z-[1000] pointer-events-none transform -translate-x-1/2 flex flex-col items-center justify-end"
          style={{
            top: `${pinY}%`,
            height: '140px',
            marginTop: '-140px' // Offset to align bottom of pin with the center point
          }}
        >
          {centerAddress && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white border border-neutral-100 rounded-[18px] px-4 py-2.5 mb-2 shadow-xl flex items-center gap-3 whitespace-nowrap"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-[18px]">
                🚲
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-black text-neutral-900 leading-none truncate max-w-[180px]">
                  {centerAddress}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 mt-1 uppercase tracking-wider">
                  Secteur de recherche
                </span>
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-neutral-100 rotate-45" />
            </motion.div>
          )}
          <div className="relative w-[38px] h-[50px]">
            <img src="/Images/map Assets/LocationPin.png" className="w-full h-full object-contain" alt="Branded Pin" />
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes radarPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes pinBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
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