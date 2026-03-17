"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface OrderMapContentProps {
    step: number;
    providers?: any[];
    selectedProviderId?: string | null;
    onProviderSelect?: (id: string) => void;
    onMapMove?: (lat: number, lng: number) => void;
    center?: [number, number];
}

export default function OrderMapContent({
    step,
    providers = [],
    selectedProviderId,
    onProviderSelect,
    onMapMove,
    center = [31.5085, -9.7595] // Default to Essaouira
}: OrderMapContentProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: center,
            zoom: 16,
            zoomControl: false,
            attributionControl: false,
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        map.on('moveend', () => {
            const center = map.getCenter();
            if (onMapMove) onMapMove(center.lat, center.lng);
        });

        markersRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !markersRef.current) return;
        const map = mapRef.current;
        const markersLayer = markersRef.current;

        markersLayer.clearLayers();

        // 1. Common Teal Pin for current location (Step 1 or Step 2)
        if (step <= 2) {
            const tealIcon = L.divIcon({
                className: 'custom-teal-pin',
                html: `
                    <div class="relative w-9 h-12 flex flex-col items-center">
                        <div class="w-9 h-9 bg-[#00A082] rounded-full flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
                             <img src="/Images/map Assets/bike_icon.png" class="w-5 h-5 grayscale invert brightness-0 invert" style="filter: brightness(0) invert(1);" />
                        </div>
                        <div class="w-1 h-3 bg-[#00A082] -mt-1 shadow-sm"></div>
                        <div class="w-1.5 h-1.5 bg-black/20 rounded-full blur-[1px] mt-0.5"></div>
                    </div>
                `,
                iconSize: [36, 48],
                iconAnchor: [18, 48],
            });
            L.marker(map.getCenter(), { icon: tealIcon }).addTo(markersLayer);
        }

        // 2. Custom Provider Pins (Step 2)
        if (step === 2 && providers.length > 0) {
            const boundsArr: L.LatLngExpression[] = [];
            
            providers.forEach(provider => {
                const isSelected = selectedProviderId === provider.id;
                const lat = provider.lat || provider.location?.lat;
                const lng = provider.lng || provider.location?.lng;
                
                if (lat && lng) {
                    const html = `
                        <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
                          ${!isSelected ? `
                            <div style="
                              background:white;
                              border-radius:8px;
                              padding:4px 8px;
                              margin-bottom:4px;
                              box-shadow:0 2px 8px rgba(0,0,0,0.15);
                              font-family:sans-serif;
                              white-space:nowrap;
                              text-align:center;
                            ">
                              <div style="font-size:12px;font-weight:700;color:#111827">${provider.hourlyRate || 80} MAD</div>
                              <div style="font-size:11px;color:#F59E0B">★ ${(provider.rating || 0).toFixed(1)}</div>
                            </div>
                          ` : ''}

                          <div style="position:relative;width:${isSelected ? 56 : 44}px">
                            <svg viewBox="0 0 44 58" fill="none" width="${isSelected ? 56 : 44}" height="${isSelected ? 74 : 58}">
                              <path d="M22 0C10.4 0 1 9.4 1 21C1 36.5 22 58 22 58C22 58 43 36.5 43 21C43 9.4 33.6 0 22 0Z"
                                    fill="${isSelected ? '#F59E0B' : '#FBBF24'}"/>
                            </svg>
                            <div style="
                              position:absolute;
                              top:4px; left:50%; transform:translateX(-50%);
                              width:${isSelected ? 38 : 30}px;
                              height:${isSelected ? 38 : 30}px;
                              border-radius:50%;
                              overflow:hidden;
                              border:2px solid white;
                            ">
                              <img src="${provider.photoURL || '/Images/default-avatar.png'}"
                                   style="width:100%;height:100%;object-fit:cover"/>
                            </div>
                          </div>
                        </div>
                    `;

                    const icon = L.divIcon({
                        html,
                        className: '',
                        iconSize: [isSelected ? 56 : 44, isSelected ? 74 : 80],
                        iconAnchor: [isSelected ? 28 : 22, isSelected ? 74 : 80],
                    });

                    const marker = L.marker([lat, lng], { icon }).addTo(markersLayer);
                    marker.on('click', () => {
                        if (onProviderSelect) onProviderSelect(provider.id);
                    });
                    
                    boundsArr.push([lat, lng]);
                }
            });

            if (boundsArr.length > 0 && !selectedProviderId) {
                // Initial fit bounds when showing all
                const userLoc = map.getCenter();
                const allPoints = [userLoc, ...boundsArr];
                map.fitBounds(L.latLngBounds(allPoints as L.LatLngExpression[]), { padding: [60, 60], maxZoom: 16 });
            } else if (selectedProviderId) {
                // Zoom to focus on selected provider and user
                const selectedPro = providers.find(p => p.id === selectedProviderId);
                const proLat = selectedPro?.lat || selectedPro?.location?.lat;
                const proLng = selectedPro?.lng || selectedPro?.location?.lng;
                if (proLat && proLng) {
                    const userLoc = map.getCenter();
                    const bounds = L.latLngBounds([[userLoc.lat, userLoc.lng], [proLat, proLng]]);
                    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 });
                }
            }
        }

    }, [step, providers, selectedProviderId]);

    return <div ref={mapContainerRef} className="w-full h-full" />;
}
