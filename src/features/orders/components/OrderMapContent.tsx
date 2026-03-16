"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface OrderMapContentProps {
    step: number;
    providers?: any[];
    selectedProvider?: any;
    center?: [number, number];
}

export default function OrderMapContent({
    step,
    providers = [],
    selectedProvider,
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

        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

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

        // 1. Common Teal Pin for current location (if not provider step)
        if (step < 2) {
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

        // 2. Yellow Pins for available providers (Step 2)
        if (step === 2 && providers.length > 0) {
            const yellowIcon = L.icon({
                iconUrl: '/Images/map%20Assets/locationPinYellowOnly.png',
                iconSize: [36, 48],
                iconAnchor: [18, 48],
            });

            const boundsArr: L.LatLngExpression[] = [];
            providers.forEach(p => {
                if (p.location) {
                    const marker = L.marker([p.location.lat, p.location.lng], { icon: yellowIcon }).addTo(markersLayer);
                    boundsArr.push([p.location.lat, p.location.lng]);
                }
            });

            if (boundsArr.length > 0) {
                map.fitBounds(L.latLngBounds(boundsArr), { padding: [50, 50], maxZoom: 15 });
            }
        }

        // 3. Selected Provider special marker (Step 3)
        if (step === 3 && selectedProvider && selectedProvider.location) {
            const avatarIcon = L.divIcon({
                className: 'provider-avatar-pin',
                html: `
                    <div class="relative flex flex-col items-center">
                        <div class="relative w-14 h-14 bg-[#FBBC04] rounded-full p-1 shadow-xl border-2 border-white overflow-hidden">
                            <img src="${selectedProvider.photoURL || '/Images/default-avatar.png'}" class="w-full h-full rounded-full object-cover" />
                        </div>
                        <div class="w-1 h-4 bg-[#FBBC04] -mt-1 shadow-md"></div>
                        
                        <!-- Illustration Pin nearby (as specified in Image 6/7) -->
                        <div class="absolute -right-12 -top-4 w-12 h-16 pointer-events-none">
                            <div class="relative flex flex-col items-center">
                                <div class="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-[#FBBC04]">
                                    <span class="text-xl">🧒</span>
                                </div>
                                <div class="w-0.5 h-4 bg-[#FBBC04]"></div>
                            </div>
                        </div>
                    </div>
                `,
                iconSize: [56, 70],
                iconAnchor: [28, 70],
            });

            L.marker([selectedProvider.location.lat, selectedProvider.location.lng], { icon: avatarIcon }).addTo(markersLayer);
            map.flyTo([selectedProvider.location.lat, selectedProvider.location.lng], 16);
        }

    }, [step, providers, selectedProvider]);

    return <div ref={mapContainerRef} className="w-full h-full" />;
}
