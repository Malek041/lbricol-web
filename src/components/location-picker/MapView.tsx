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
    badge?: string | null; // 'NEW' | 'PRO' | 'ELITE' | 'CLASSIC'
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
  onLoadingChange,
  lockCenterOnFocus = false,
  disableFitBounds = false,
  clientPin,
  currentUserPin,
  destinationPin,
  centerOnUser = false,
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
  const broadcastMarkersRef = useRef<{ [id: string]: L.Marker }>({});
  const clientPinMarkerRef = useRef<L.Marker | null>(null); // Fixed Leaflet marker for Step 2
  const destinationPinMarkerRef = useRef<L.Marker | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');
  const [mapReady, setMapReady] = useState(false);
  const [internalUserPos, setInternalUserPos] = useState<{ lat: number, lng: number } | null>(null);

  const targetZoom = requestedZoom || 17;
  const mapReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flyToTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestGeocodeRef = useRef<{ lat: number, lng: number } | null>(null);

  const flyToWithOffset = (lat: number, lng: number, zoom?: number, skipOffset = false) => {
    if (!mapRef.current || !mapRef.current.getContainer()) return;
    const map = mapRef.current;

    // Safety check for Leaflet initialization
    // Leaflet requires setView to be called once before flyTo or getZoom
    if (!(map as any)._loaded) {
      map.setView([lat, lng], zoom || targetZoom);
      return;
    }

    // If zoom is not provided, use current map zoom to prevent resets
    const effectiveZoom = zoom !== undefined ? zoom : map.getZoom();

    if (skipOffset) {
      map.flyTo([lat, lng], effectiveZoom, { duration: 1.5 });
    } else {
      const mapSize = map.getSize();
      if (mapSize.x === 0 || mapSize.y === 0) {
        // Fallback to basic flyTo if size is not yet detected
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
    }, 450); // Slightly longer to allow fly animation start
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    latestGeocodeRef.current = { lat, lng };
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

    if (latestGeocodeRef.current?.lat === lat && latestGeocodeRef.current?.lng === lng) {
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
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
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

      gpsMarkerRef.current = L.marker([lat, lng], { icon: radarIcon, zIndexOffset: 7000 }).addTo(map);
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
      onLoadingChange?.(true);

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
                  <div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
                    <div style="position:absolute;width:20px;height:20px;background:#10B981;border-radius:50%;opacity:0.4;animation:radarPulse 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                    <div style="position:absolute;width:12px;height:12px;background:#10B981;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);z-index:10;"></div>
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });
              gpsMarkerRef.current = L.marker([latitude, longitude], { icon: gpsIcon }).addTo(mapRef.current);
            }
            onLoadingChange?.(false);
          },
          (error) => {
            console.warn(`Geolocation error (highAccuracy: ${highAccuracy}):`, error);
            if (highAccuracy) {
              // Try again without high accuracy if it fails or times out
              requestGps(false);
            } else {
              onLocationError?.(error);
              onLoadingChange?.(false);
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
        flyToWithOffset(initialLocation.lat, initialLocation.lng, targetZoom, pinY === 50);
      }
      setLastAssignedInitial(locStr);
    }
  }, [initialLocation, mapReady]);

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
      const size = isFocused ? 62 : 44;

      const bounceStyle = isFocused ? "animation: pinBounce 2s ease-in-out infinite;" : "";

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:160px;cursor:pointer;opacity:${opacity};transform:scale(${scale});transform-origin:bottom center;transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="${bounceStyle} display:flex;flex-direction:column;align-items:center;">
              ${isFocused ? (() => {
            const b = (pin.badge || '').toUpperCase();
            const isNew = (pin.taskCount || 0) < 10 || b === 'NEW';
            const badgeText = isNew ? 'NEW' : (b === 'ELITE' ? 'ELITE' : b === 'PRO' ? 'PRO' : 'CLASSIC');
            const badgeBg = isNew ? '#F5F3FF' : (b === 'ELITE' ? '#FFF7ED' : b === 'PRO' ? '#F0FDF4' : '#F3F4F6');
            const badgeColor = isNew ? '#7C3AED' : (b === 'ELITE' ? '#EA580C' : b === 'PRO' ? '#16A34A' : '#4B5563');
            const badgeIcon = isNew ? '✦' : (b === 'ELITE' ? '🏆' : b === 'PRO' ? '💎' : '🛡️');
            const ratingStr = (!pin.taskCount || pin.taskCount === 0 || !pin.rating) ? '0.0' : pin.rating.toFixed(1);
            return `
              <div style="position: relative; display: flex; flex-direction: column; align-items: center; margin-bottom: 8px;">
                <div style="background:#fff;border-radius:14px;padding:10px 14px;
                  box-shadow:0 8px 24px rgba(0,0,0,0.13);font-family:sans-serif;
                  display:flex;flex-direction:column;align-items:center;gap:6px;
                  border:1px solid #f3f4f6;position:relative;z-index:10;min-width:110px;">
                  
                  <!-- Badge row -->
                  <div style="background:${badgeBg};color:${badgeColor};font-size:9px;font-weight:900;
                    padding:2px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:3px;
                    letter-spacing:0.05em;">
                    <span>${badgeIcon}</span><span>${badgeText}</span>
                  </div>

                  <!-- Jobs + Stars row -->
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="display:flex;flex-direction:column;align-items:center;line-height:1.1;">
                      <span style="font-size:15px;font-weight:950;color:#111827;">${pin.taskCount || 0}</span>
                      <span style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;">Jobs</span>
                    </div>
                    <div style="width:1px;height:24px;background:#F3F4F6;"></div>
                    <div style="display:flex;flex-direction:column;align-items:center;line-height:1.1;">
                      <span style="font-size:15px;font-weight:950;color:#111827;display:flex;align-items:center;gap:2px;">
                        <span style="color:#FBBF24;font-size:13px;">★</span>${ratingStr}
                      </span>
                    </div>
                    <div style="width:1px;height:24px;background:#F3F4F6;"></div>
                    <div style="display:flex;flex-direction:column;align-items:center;line-height:1.1;">
                      <span style="font-size:14px;font-weight:950;color:#01A083;">${pin.rate || 80}</span>
                      <span style="font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;">MAD/hr</span>
                    </div>
                  </div>
                </div>
                <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:8px solid white;margin-top:-1px;z-index:5;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.05));"></div>
              </div>`;
          })() : ''}
              <div style="position:relative;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;flex-shrink:0;transition: all 0.3s; margin-bottom: 0px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; background: #fff;">
                ${pin.avatarUrl
            ? `<img src="${pin.avatarUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.onerror=null; this.src='/Images/Vectors Illu/LbricolFaceOY.webp'; this.parentElement.style.background='#F3F4F6'; this.innerHTML='👤';"/>`
            : `<div style="width:100%;height:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:24px">👤</div>`
          }
              </div>
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
            color: '#01A083',
            weight: 6,
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