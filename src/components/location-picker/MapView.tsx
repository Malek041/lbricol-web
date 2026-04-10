"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ArrowRight } from 'lucide-react';
import { LocationPoint } from './types';
import { useLanguage } from '@/context/LanguageContext';
import { Capacitor } from '@capacitor/core';
import { NativeSettings } from 'capacitor-native-settings';

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
    badge?: string | null; // 'NEW' | 'PRO' | 'ELITE' | 'CLASSIC'
    isLive?: boolean;
    name?: string;
    isFilteredOut?: boolean;
    zIndexOffset?: number;
  }>;
  broadcastPins?: Array<{
    id: string;
    lat: number;
    lng: number;
    price: number | string;
    rating?: number;
    date?: any;
    time?: string;
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
  onPermissionStatusChange?: (denied: boolean) => void;
  lockCenterOnFocus?: boolean;  // When true, do NOT auto-fly to focused provider pin
  disableFitBounds?: boolean;   // When true, do NOT auto-fit map to all provider pins
  clientPin?: { lat: number; lng: number }; // When set, place a fixed Leaflet marker (Step 2)
  currentUserPin?: {
    lat?: number;
    lng?: number;
    avatarUrl?: string | null;
  };
  destinationPin?: { lat: number; lng: number };
  centerOnUser?: boolean;
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
  onLoadingChange: onLoadingChangeProp,
  onPermissionStatusChange,
  lockCenterOnFocus = false,
  disableFitBounds = false,
  clientPin,
  currentUserPin,
  destinationPin,
  centerOnUser = false,
}) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsMarkerRef = useRef<L.Marker | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // ── Permission Check ──
  useEffect(() => {
    const checkPermission = () => {
      if ("permissions" in navigator) {
        navigator.permissions.query({ name: 'geolocation' as any }).then((result) => {
          const updateState = () => {
            if (result.state === 'denied') {
              setPermissionDenied(true);
              onPermissionStatusChange?.(true);
            } else {
              setPermissionDenied(false);
              onPermissionStatusChange?.(false);
            }
          };

          updateState();
          result.onchange = updateState;
        });
      }
    };

    checkPermission();

    // Re-check when window becomes visible (e.g. returning from settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkPermission();
        // If we were waiting for location, trigger it
        if (triggerGps) {
          // Parent will handle if needed, or we can manually trigger a one-off
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [triggerGps]);
  const gpsDotRef = useRef<L.CircleMarker | null>(null);
  const gpsPulseRef = useRef<L.CircleMarker | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const routeLabelRef = useRef<L.Marker | null>(null);
  const providerMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const broadcastMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const clientPinMarkerRef = useRef<L.Marker | null>(null); // Fixed Leaflet marker for Step 2
  const destinationPinMarkerRef = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');
  const [mapReady, setMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(requestedZoom || 17);
  const [internalUserPos, setInternalUserPos] = useState<{ lat: number, lng: number } | null>(null);

  const targetZoom = requestedZoom || 17;
  const mapReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestGeocodeRef = useRef<{ lat: number, lng: number } | null>(null);
  const hasAnimatedPinsRef = useRef(false);

  const flyToWithOffset = (lat: number, lng: number, zoom?: number, skipOffset = false) => {
    if (!mapRef.current || !mapRef.current.getContainer() || isNaN(lat) || isNaN(lng)) return;
    const map = mapRef.current;

    // Safety check for Leaflet initialization
    if (!(map as any)._loaded) {
      map.setView([lat, lng], zoom || targetZoom);
      return;
    }

    // Get the MOST current zoom to prevent resetting to targetZoom (e.g. 17) during interaction
    const currentZoom = map.getZoom();
    const effectiveZoom = zoom !== undefined ? zoom : currentZoom;

    if (skipOffset) {
      map.flyTo([lat, lng], effectiveZoom, { duration: 1.5 });
    } else {
      const mapSize = map.getSize();
      if (mapSize.x === 0 || mapSize.y === 0) {
        map.flyTo([lat, lng], effectiveZoom, { duration: 1.5 });
      } else {
        const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
        const targetPoint = L.point(mapSize.x / 2, mapSize.y * (pinY / 100));
        const targetLatLng = L.latLng(lat, lng);
        const centerLatLng = map.unproject(
          map.project(targetLatLng, effectiveZoom).add(centerPoint).subtract(targetPoint),
          effectiveZoom
        );
        map.flyTo(centerLatLng, effectiveZoom, { duration: 1.5 });
      }
    }

    if (flyToTimeoutRef.current) clearTimeout(flyToTimeoutRef.current);
    flyToTimeoutRef.current = setTimeout(() => {
      if (mapRef.current && mapRef.current.getContainer()) {
        mapRef.current.invalidateSize();
      }
    }, 450);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    latestGeocodeRef.current = { lat, lng };
    onLoadingChangeProp?.(true);
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

    if (latestGeocodeRef.current?.lat === lat && latestGeocodeRef.current?.lng === lng) {
      setAddress(finalAddress);
      onLocationChange({
        lat,
        lng,
        address: finalAddress,
        city: city || undefined,
        area: area || undefined
      });
      onLoadingChangeProp?.(false);
      try {
        localStorage.setItem('lastKnownLat', lat.toString());
        localStorage.setItem('lastKnownLng', lng.toString());
      } catch (e) { }
    }
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
          // If we have both pins for a move/delivery, we still need an initial setView
          // for Leaflet to be ready, but we use the clientPin as early center.
          // The routing effect will eventually handle the fitBounds.
          if (clientPin?.lat && destinationPin?.lat) {
            mapRef.current.setView([clientPin.lat, clientPin.lng], zoom);
            setMapReady(true);
            return;
          }

          const centerPoint = L.point(mapSize.x / 2, mapSize.y / 2);
          const targetPoint = L.point(mapSize.x / 2, mapSize.y * (pinY / 100));
          const targetLatLng = L.latLng(lat, lng);
          const centerLatLng = mapRef.current.unproject(
            mapRef.current.project(targetLatLng, zoom).add(centerPoint).subtract(targetPoint),
            zoom
          );
          mapRef.current.setView(centerLatLng, zoom);
        } else {
          if (!(clientPin?.lat && destinationPin?.lat)) {
            mapRef.current.setView([lat, lng], zoom);
          }
        }
        setMapReady(true);
        reverseGeocode(lat, lng);
      }
    }, 100);

    map.on('dragstart', () => { onInteractionStart?.(); });
    map.on('dragend', () => { onInteractionEnd?.(); });
    map.on('touchstart', () => { onInteractionStart?.(); });
    map.on('touchend', () => { onInteractionEnd?.(); });
    map.on('zoomend', () => {
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());
      }
    });

    map.on('moveend', () => {
      if (!interactive) return;
      const pinPoint = L.point(
        map.getSize().x / 2,
        map.getSize().y * (pinY / 100)
      );
      const center = map.containerPointToLatLng(pinPoint);

      // Immediately signal that coordinates changed (for accurate pin data)
      // but keep the current address to avoid flicker until geocode finishes
      onLoadingChangeProp?.(true);
      onLocationChange({
        lat: center.lat,
        lng: center.lng,
        address: address || "Locating..."
      });

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        reverseGeocode(center.lat, center.lng);
      }, 400);
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
  const hasFlownToGPSOnce = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setInternalUserPos({ lat: latitude, lng: longitude });

          // Center on user only the FIRST time, and only if no explicit initialLocation was set
          // This prevents the map from constantly snapping back to GPS on drag/zoom
          if (mapRef.current && (!initialLocation || centerOnUser) && !hasFlownToGPSOnce.current) {
            hasFlownToGPSOnce.current = true;
            flyToWithOffset(latitude, longitude, targetZoom, true);
          }
        },
        (error) => console.warn("Watch GPS failed:", error),
        { enableHighAccuracy: true, maximumAge: 10000 }
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
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; width: 32px; height: 32px; background: #10B981; border-radius: 50%; opacity: 0.3; animation: radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
            ${avatar ? `
              <div style="position: relative; width: 28px; height: 28px; background: white; border: 2px solid white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.25); z-index: 10; overflow: hidden; display: flex; items-center; justify-center;">
                <img src="${avatar}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            ` : `
              <div style="position: absolute; width: 16px; height: 16px; background: #10B981; border-radius: 50%; opacity: 0.2; animation: radarPulse 2s cubic-bezier(0,0,0.2,1) infinite; animation-delay: 1s;"></div>
              <div style="position: absolute; width: 10px; height: 10px; background: #10B981; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2); z-index: 10;"></div>
            `}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      gpsMarkerRef.current = L.marker([lat, lng], { 
        icon: radarIcon, 
        interactive: false,
        zIndexOffset: -100 
      }).addTo(map);
    };

    if (mapRef.current) {
      render();
    } else {
      const timer = setTimeout(render, 500);
      return () => clearTimeout(timer);
    }
  }, [userPosition, internalUserPos, currentUserPin, mapReady]);

  // ── Handle GPS Trigger ──────────────────────────────────────────────
  useEffect(() => {
    if (triggerGps && triggerGps > 0 && mapRef.current && mapReady) {
      onLoadingChangeProp?.(true);

      const requestGps = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setInternalUserPos({ lat: latitude, lng: longitude });

            if (mapRef.current) {
              mapRef.current.invalidateSize();
              flyToWithOffset(latitude, longitude, targetZoom, pinY === 50);
            }

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
                  <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;pointer-events:none;">
                    <div style="position:absolute;width:20px;height:20px;background:#10B981;border-radius:50%;opacity:0.4;animation:radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                    <div style="position:absolute;width:12px;height:12px;background:#10B981;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:10;"></div>
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });
              gpsMarkerRef.current = L.marker([latitude, longitude], { 
                icon: gpsIcon,
                interactive: false,
                zIndexOffset: -100 // Lower z-index to not block actual pins
              }).addTo(mapRef.current);
            }
            onLoadingChangeProp?.(false);
          },
          (error) => {
            console.warn(`Geolocation error (highAccuracy: ${highAccuracy}):`, error);
            if (highAccuracy) {
              // Try again without high accuracy if it fails or times out
              requestGps(false);
            } else {
              onLocationError?.(error);
              onLoadingChangeProp?.(false);
            }
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 8000 : 15000,
            maximumAge: 30000
          }
        );
      };

      requestGps(true);
    }
  }, [triggerGps, mapReady]);

  // ── Handle Late-Arriving Initial Location ──────────────────────────
  const [lastAssignedInitial, setLastAssignedInitial] = useState<string | null>(null);
  useEffect(() => {
    if (initialLocation && mapRef.current && mapReady) {
      const locStr = `${initialLocation.lat},${initialLocation.lng}`;
      // If the location changed AFTER we already initialized with a default
      if (lastAssignedInitial !== null && lastAssignedInitial !== locStr) {
        // Use undefined for zoom to preserve current map zoom on re-renders
        flyToWithOffset(initialLocation.lat, initialLocation.lng, undefined, pinY === 50);
      }
      setLastAssignedInitial(locStr);
    }
  }, [initialLocation, mapReady]);

  useEffect(() => {
    if (flyToPoint && mapRef.current && mapReady) {
      // Use undefined for zoom to preserve current map zoom on re-renders
      flyToWithOffset(flyToPoint.lat, flyToPoint.lng, undefined, flyToPoint.skipOffset ?? false);
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

    const zoomScale = Math.max(0.9, Math.min(3.0, Math.pow(1.18, currentZoom - 16)));

    const shouldAnimate = !hasAnimatedPinsRef.current;

    providerPins.forEach((pin, index) => {
      const isFocused = pin.id === focusedProviderId;
      const hasFocus = !!focusedProviderId;
      const isFilteredOut = !!pin.isFilteredOut;
      const opacity = isFilteredOut ? 0.35 : 1;
      const baseScale = hasFocus && !isFocused ? 0.9 : 1;
      const scale = baseScale * zoomScale;
      const size = 52 * zoomScale;

      const animation = shouldAnimate 
        ? `pinDropIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; animation-delay: ${index * 0.08}s;` 
        : 'none';
        
      const cardAnimation = shouldAnimate 
        ? `providerCardFadeIn 0.5s both; animation-delay: ${index * 0.08 + 0.3}s;` 
        : 'opacity: 1; transform: translate(0, -50%) scale(1);';

      // Smart positioning: if client is significantly above provider, show card BELOW pin
      const isClientAbove = clientPin && (clientPin.lat > pin.lat + 0.001);

      const icon = L.divIcon({
        className: 'bricoler-pin-container',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${size}px;height:${size}px;cursor:pointer;opacity:${opacity};transform:scale(${scale});position:relative; animation: ${animation}">
            <div style="display:flex;flex-direction:column;align-items:center;position:relative;">
              <div style="position: absolute; left: calc(100% + 8px); top: 50%; white-space: nowrap; transition: all 0.3s; pointer-events: none; animation: ${cardAnimation}">
                <div style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); 
                  padding: 4px 10px; border-radius: 20px; 
                  border: 1px solid ${isFocused ? '#027963' : '#F3F4F6'};
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: ${isFocused ? '13px' : '11px'}; font-weight: ${isFocused ? '900' : '700'}; 
                    color: ${isFocused ? '#027963' : '#374151'}; font-family: sans-serif;
                    letter-spacing: -0.2px;">
                    ${(() => {
                const emojis = ['❤️', '🥰', '🥳', '✨', '💖', '😊', '😇', '😍', '😻', '🧡'];
                const index = pin.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % emojis.length;
                return emojis[index];
              })()} ${pin.name || 'Bricoler'}
                  </span>
                  <div style="display: flex; align-items: center; gap: 2px; border-left: 1px solid #E5E7EB; padding-left: 6px;">
                    <span style="color: #FFC244; font-size: 11px;">★</span>
                    <span style="font-size: 11px; font-weight: 800; color: #111827;">${pin.rating ? Number(pin.rating).toFixed(1) : '0.0'}</span>
                  </div>
                </div>
              </div>
              <div style="position:relative;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;flex-shrink:0;transition: all 0.3s; margin-bottom: 0px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; background: #fff;">
                ${pin.avatarUrl
            ? `<img src="${pin.avatarUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null; this.src='/Images/Vectors Illu/LbricolFaceOY.webp'; this.parentElement.style.background='#F3F4F6'; this.innerHTML='👤';"/>`
            : `<div style="width:100%;height:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>`
          }
                ${pin.isLive ? `
                  <div style="position:absolute; bottom:2px; right:2px; width:10px; height:10px; background:#22c55e; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 2px rgba(34,197,94,0.4);"></div>
                ` : ''}
              </div>
            </div>
          </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([pin.lat, pin.lng], { 
        icon, 
        zIndexOffset: isFocused ? 2000 : (isFilteredOut ? -1000 : (pin.zIndexOffset || 0)),
        interactive: !isFilteredOut
      })
        .addTo(map)
        .on('click', (e) => {
          if (isFilteredOut) return;
          L.DomEvent.stopPropagation(e);
          onProviderClick?.(pin.id);
        });

      providerMarkersRef.current[pin.id] = marker;
    });

    if (providerPins.length > 0) {
      hasAnimatedPinsRef.current = true;
    }

    // Removed fitBounds from here to prevent zoom resets on focus changes
  }, [providerPins, mapReady, focusedProviderId, serviceIconUrl, onProviderClick, currentZoom]);

  // ── Fixed client pin marker for Step 2 (moves with map, always over GPS dot) ──
  useEffect(() => {
    if (!clientPin || !mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const html = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:140px; pointer-events:none;">
        ${centerAddress ? `
          <div style="background:white; border:1px solid #f3f4f6; border-radius:18px; padding:10px 16px; margin-bottom:8px; box-shadow:0 10px 25px rgba(0,0,0,0.1); display:flex; items-center; gap:12px; white-space:nowrap; position:relative;">
            <div style="width:32px; height:32px; border-radius:50%; background:#ecfdf5; display:flex; align-items:center; justify-content:center; font-size:18px;">🚲</div>
            <div style="display:flex; flex-direction:column; justify-content:center;">
              <div style="font-size:13px; font-weight:900; color:#111827; line-height:1; margin-bottom:4px; max-width:180px; overflow:hidden; text-overflow:ellipsis;">${centerAddress}</div>
              <div style="font-size:11px; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.05em;">Lieu de départ</div>
            </div>
            <div style="position:absolute; bottom:-6px; left:50%; margin-left:-6px; width:12px; height:12px; background:white; border-right:1px solid #f3f4f6; border-bottom:1px solid #f3f4f6; transform:rotate(45deg);"></div>
          </div>
        ` : `
          <div style="background:#027963; color:white; border-radius:12px; padding:4px 10px; margin-bottom:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; position:relative; z-index:10;">
            TOI
            <div style="position:absolute; bottom:-4px; left:50%; margin-left:-4px; width:8px; height:8px; background:#027963; transform:rotate(45deg);"></div>
          </div>
        `}
        <img src="/Images/map Assets/LocationPin.png" style="width:38px; height:50px; object-fit:contain; display:block;" alt="Start location" />
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html,
      iconSize: [240, 140],
      iconAnchor: [120, 140], // bottom center of the container (tip of the pin)
    });

    const marker = L.marker([clientPin.lat, clientPin.lng], {
      icon,
      zIndexOffset: 5000,
      interactive: false,
    }).addTo(map);

    clientPinMarkerRef.current = marker;

    return () => {
      if (clientPinMarkerRef.current) {
        mapRef.current?.removeLayer(clientPinMarkerRef.current);
        clientPinMarkerRef.current = null;
      }
    };
  }, [clientPin?.lat, clientPin?.lng, mapReady, centerAddress]);

  // ── Zoom/Fly to focused provider ──
  useEffect(() => {
    if (!focusedProviderId || !mapRef.current || !mapReady || !providerPins) return;
    const pin = providerPins.find(p => p.id === focusedProviderId);
    if (pin) {
      flyToWithOffset(pin.lat, pin.lng, 17, pinY === 50);
    }
  }, [focusedProviderId, mapReady, providerPins, pinY]);

  // ── Render destination pin marker ───────────────────────────────────
  useEffect(() => {
    if (!destinationPin || !mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const html = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:140px; pointer-events:none;">
        <div style="background:#FF9911; color:white; border-radius:12px; padding:4px 10px; margin-bottom:4px; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; position:relative; z-index:10;">
          ARRIVÉE
          <div style="position:absolute; bottom:-4px; left:50%; margin-left:-4px; width:8px; height:8px; background:#FF9911; transform:rotate(45deg);"></div>
        </div>
        <img src="/Images/map Assets/locationPinYellowOnly.png" style="width:38px; height:50px; object-fit:contain; display:block;" alt="Destination location" />
      </div>
    `;

    const icon = L.divIcon({
      className: '',
      html,
      iconSize: [240, 140],
      iconAnchor: [120, 140],
    });

    const marker = L.marker([destinationPin.lat, destinationPin.lng], {
      icon,
      zIndexOffset: 5000,
      interactive: false,
    }).addTo(map);

    destinationPinMarkerRef.current = marker;

    return () => {
      if (destinationPinMarkerRef.current) {
        mapRef.current?.removeLayer(destinationPinMarkerRef.current);
        destinationPinMarkerRef.current = null;
      }
    };
  }, [destinationPin?.lat, destinationPin?.lng, mapReady]);

  // ── Render broadcast pins (Orders) ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    // Clear old broadcast markers
    Object.values(broadcastMarkersRef.current || {}).forEach(m => {
      try { map.removeLayer(m); } catch (e) { }
    });
    broadcastMarkersRef.current = {};

    if (!broadcastPins || broadcastPins.length === 0) return;

    broadcastPins.forEach(pin => {
      if (!pin) return; // Safety guard
      const isFocused = pin.id === focusedOrderId;
      const opacity = 1;
      const scale = 1;
      const size = 50;
      const bounceStyle = isFocused ? "animation: pinBounce 2s ease-in-out infinite;" : "";

      const markerLat = Number(pin.lat || (pin as any).locationDetails?.lat || 31.5085);
      const markerLng = Number(pin.lng || (pin as any).locationDetails?.lng || -9.7595);

      if (isNaN(markerLat) || isNaN(markerLng)) return;

      const icon = L.divIcon({
        className: '',
        html: (() => {
          // Format date/time for display
          let dateTimeHtml = '';
          if (pin.date || pin.time) {
            let dateStr = '';
            try {
              const d = pin.date;
              if (d) {
                const dt = (typeof d?.toDate === 'function') ? d.toDate() : (typeof d === 'string' ? new Date(d) : d);
                if (dt && !isNaN(dt.getTime())) {
                  dateStr = dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                }
              }
            } catch(e) {}
            const timeStr = pin.time ? String(pin.time).split('-')[0].trim() : '';
            if (dateStr || timeStr) {
              dateTimeHtml = `<div style="font-size:11px;color:#374151;font-weight:700;display:flex;align-items:center;gap:4px;">
                ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
                ${dateStr && timeStr ? '<span style="color:#d1d5db">|</span>' : ''}
                ${timeStr ? `<span style="color:#01A083;font-weight:900">${timeStr}</span>` : ''}
              </div>`;
            }
          }
          return `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:160px;cursor:pointer;opacity:${opacity};transform:scale(${scale});transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);${bounceStyle}">
            <div style="background:#fff;border-radius:12px;padding:6px 12px;margin-bottom:6px;
              box-shadow:0 4px 15px rgba(0,0,0,0.18);font-family:sans-serif;text-align:center;white-space:nowrap;
              display: flex; flex-direction: column; align-items: center; border: 1px solid #f3f4f6;gap:2px;">
              <div style="font-size:14px;font-weight:900;color:#01A083">${pin.price} MAD</div>
              ${dateTimeHtml}
            </div>
            <div style="position:relative;width:${size}px;height:${size}px;transition: width 0.3s, height 0.3s; margin-bottom: 0px; background: #fff; border-radius: 50%; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 8px;">
              <img src="${pin.serviceIcon || '/Images/Vectors Illu/NewOrder.webp'}" style="width:100%;height:100%;object-fit:contain"/>
            </div>
          </div>
        `})(),
        iconSize: [120, 160],
        iconAnchor: [60, 160],
      });

      const marker = L.marker([markerLat, markerLng], { icon, zIndexOffset: isFocused ? 2000 : 0 })
        .addTo(map);

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e as any);
        onOrderClick?.(pin.id);
      });

      broadcastMarkersRef.current[pin.id!] = marker;
    });
  }, [broadcastPins, mapReady, focusedOrderId, onOrderClick]);

  // ── Holistic view when unselecting ──────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady || focusedProviderId || !providerPins || providerPins.length === 0) return;
    const map = mapRef.current;
    
    // Create bounds for all providers + client
    const points: L.LatLngExpression[] = providerPins.map(p => [p.lat, p.lng] as L.LatLngExpression);
    const startPt = clientPin || initialLocation;
    if (startPt) points.push([startPt.lat, startPt.lng]);
    
    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, {
      padding: [40, 40],
      maxZoom: 16,
      duration: 1.5
    });
  }, [focusedProviderId, providerPins, mapReady, clientPin, initialLocation]);

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

    const startPoint = clientPin || initialLocation;
    if (!startPoint) return;

    const start = [startPoint.lng, startPoint.lat];
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
            color: '#01A083',
            weight: 8,
            opacity: 1,
            dashArray: '12, 12',
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Add a shadow/glow effect underneath the branded line for depth
          L.polyline(coords, {
            color: '#01A083',
            weight: 12,
            opacity: 0.15,
            lineCap: 'round',
          }).addTo(map);

          // Find midpoint index for the time bubble
          const midIdx = Math.floor(coords.length / 2);
          const midPoint = coords[midIdx];

          if (midPoint && midPoint[0] !== undefined && midPoint[1] !== undefined) {
            const labelIcon = L.divIcon({
              className: '',
              html: `
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                  <div style="
                    background: #01A083; 
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
                  <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #01A083; margin-top: -1px; z-index: 999;"></div>
                </div>
              `,
              iconSize: [120, 50],
              iconAnchor: [60, 50],
            });
            routeLabelRef.current = L.marker(midPoint, {
              icon: labelIcon,
              zIndexOffset: 3000
            }).addTo(map);
          }

          // Center the path nicely
          map.fitBounds(routeLayerRef.current.getBounds(), {
            paddingTopLeft: [80, 60],
            paddingBottomRight: [60, 500], // Increased to ensure line is above condensed sheet
            animate: true,
            duration: 1.5
          });

        } else {
          // Fallback to straight line if OSRM fails
          const startPt = clientPin || initialLocation;
          if (startPt) {
            routeLayerRef.current = L.polyline([[startPt.lat, startPt.lng], [focusPin.lat, focusPin.lng]], {
              color: '#01A083', weight: 6, opacity: 0.8, dashArray: '10, 10'
            }).addTo(map);

            map.fitBounds(routeLayerRef.current.getBounds(), {
              paddingTopLeft: [80, 60],
              paddingBottomRight: [60, 500]
            });
          }
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
  }, [focusedProviderId, initialLocation, mapReady, providerPins, clientPin]);

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
            color: '#01A083', // Branded green
            weight: 7,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);

          // Find midpoint index for the time bubble
          const midIdx = Math.floor(coords.length / 2);
          const midPoint = coords[midIdx];

          if (midPoint && midPoint[0] !== undefined && midPoint[1] !== undefined) {
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
                  border: 2px solid #01A083;
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
          }

          // Auto-fit if requested, or at least fit the route
          const bounds = L.latLngBounds(coords);
          if (mapReadyTimeoutRef.current) {
            clearTimeout(mapReadyTimeoutRef.current);
            mapReadyTimeoutRef.current = null;
          }
          map.fitBounds(bounds, { padding: [40, 40], animate: true });

        } else if (clientPin && destinationPin && clientPin.lat && destinationPin.lat) {
          routeLayerRef.current = L.polyline([[clientPin.lat, clientPin.lng], [destinationPin.lat, destinationPin.lng]], {
            color: '#01A083', weight: 6, opacity: 0.5
          }).addTo(map);
          map.fitBounds(L.latLngBounds([[clientPin.lat, clientPin.lng], [destinationPin.lat, destinationPin.lng]]), { padding: [40, 40] });
        }
      } catch (e) {
        console.warn("Direct routing failed", e);
      }
    };

    loadDirectRoute();

    return () => {
      if (!focusedProviderId) {
        if (routeLayerRef.current) mapRef.current?.removeLayer(routeLayerRef.current);
        if (routeLabelRef.current) mapRef.current?.removeLayer(routeLabelRef.current);
      }
    };
  }, [clientPin, destinationPin, mapReady, focusedProviderId]);

  // ── Auto-fit bounds ONLY when the LIST of providers changes ────────────────
  useEffect(() => {
    if (disableFitBounds) return; // Step 2: keep map locked on client address
    if (!mapRef.current || !mapReady || !providerPins || providerPins.length === 0 || !initialLocation) return;
    const map = mapRef.current;

    const allPoints: L.LatLngTuple[] = [
      [initialLocation!.lat, initialLocation!.lng],
      ...providerPins.map(p => [p.lat, p.lng] as L.LatLngTuple)
    ];
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [100, 100], animate: true });
  }, [providerPins?.length, mapReady, disableFitBounds]); // Dependency on length/exists, not focus

  // ── Auto-fit bounds for broadcast pins (Marketplace) ────────────────
  useEffect(() => {
    if (disableFitBounds) return;
    if (!mapRef.current || !mapReady || !broadcastPins || broadcastPins.length === 0) return;
    const map = mapRef.current;

    const allPoints: L.LatLngTuple[] = broadcastPins.map(p => [
      Number(p.lat || (p as any).locationDetails?.lat || 31.5085),
      Number(p.lng || (p as any).locationDetails?.lng || -9.7595)
    ]);
    
    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true });
    } else if (allPoints.length === 1 && !initialLocation) {
      // If only one pin and no initial location was set, center on it
      map.flyTo(allPoints[0], 15, { animate: true });
    }
  }, [broadcastPins?.length, mapReady, disableFitBounds]);

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

      {/* Location Header (Full Width - Styled to match pic) */}
      <AnimatePresence>
        {permissionDenied && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            onClick={async () => {
              if (Capacitor.isNativePlatform()) {
                try {
                  // Direct to App Settings where permissions are
                  await NativeSettings.open({
                    optionAndroid: 'app',
                    optionIOS: 'app'
                  } as any);
                  return;
                } catch (err) {
                  console.error("Native settings redirect failed:", err);
                }
              }

              const requestGps = (highAccuracy: boolean) => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setPermissionDenied(false);
                    const { latitude, longitude } = position.coords;
                    setInternalUserPos({ lat: latitude, lng: longitude });
                    if (mapRef.current) {
                      flyToWithOffset(latitude, longitude, targetZoom, pinY === 50);
                    }
                    reverseGeocode(latitude, longitude);
                  },
                  (error) => {
                    if (error.code === error.PERMISSION_DENIED && !Capacitor.isNativePlatform()) {
                      alert(t({ 
                        en: "Location is blocked. Please enable it in Settings > Safari > Location.",
                        fr: "La localisation est bloquée. Veuillez l'activer dans Réglages > Safari > Localisation.",
                        ar: "تحديد الموقع محظور. يرجى تفعيله من الإعدادات > Safari > الموقع."
                      }));
                    }
                  },
                  { enableHighAccuracy: highAccuracy, timeout: 5000 }
                );
              };
              requestGps(true);
            }}
            className="absolute top-0 left-0 right-0 z-[2000] bg-[#FFCC02] h-[72px] flex flex-col items-center justify-center cursor-pointer shadow-lg active:brightness-95 transition-all px-4"
          >
            <h3 className="text-[17px] font-black text-[#111827] text-center leading-none">
              {t({ en: 'Unable to locate you', fr: 'Impossible de vous localiser', ar: 'تعذر تحديد موقعك' })}
            </h3>
            <p className="text-[14px] font-bold text-[#111827]/80 text-center mt-1.5 leading-none">
              {t({ en: 'Tap here to enable location', fr: 'Appuyez ici pour activer la localisation', ar: 'اضغط هنا لتفعيل تحديد المواقع' })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes radarPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes pinBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pinDropIn {
          0% { transform: translateY(-30px) scale(0); opacity: 0; }
          70% { transform: translateY(5px) scale(1.1); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes providerCardFadeIn {
          0% { transform: translate(-10px, -50%) scale(0.8); opacity: 0; }
          100% { transform: translate(0, -50%) scale(1); opacity: 1; }
        }
        .bricoler-pin-container {
          background: transparent !important;
          border: none !important;
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