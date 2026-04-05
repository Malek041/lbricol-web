"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Banknote, ChevronRight, X, Bell, Navigation } from 'lucide-react';
import { getServiceVector } from '@/config/services_config';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });

interface LiveOrdersMapProps {
  city: string;
  onSelectOrder: (order: any) => void;
  language: string;
  notificationsCount?: number;
  onShowNotifications?: () => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  triggerGps?: number;
  currentUserPin?: {
    lat?: number;
    lng?: number;
    avatarUrl?: string | null;
  };
  broadcastPins?: any[];
  orderData?: any[]; // Raw order/job objects to lookup on pin click
}

export default function LiveOrdersMap({
  city,
  onSelectOrder,
  language,
  notificationsCount = 0,
  onShowNotifications,
  onInteractionStart,
  onInteractionEnd,
  triggerGps,
  currentUserPin,
  broadcastPins: externalPins,
  orderData,
}: LiveOrdersMapProps) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [requestedFlyTo, setRequestedFlyTo] = useState<{ lat: number, lng: number } | undefined>(undefined);
  // Freeze initial map center — never update after first assignment to prevent snap-back
  const frozenInitialLocation = useRef<{ lat: number; lng: number } | undefined>(undefined);

  useEffect(() => {
    if (!city || externalPins) return; // Don't fetch if pins are provided externally

    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'broadcast'),
      where('city', '==', city),
      where('isPublic', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(docs);
    });

    return () => unsubscribe();
  }, [city, externalPins]);

  const internalPins = useMemo(() => orders.map(order => ({
    id: order.id,
    lat: order.locationDetails?.lat || 31.5085,
    lng: order.locationDetails?.lng || -9.7595,
    price: order.totalPrice || order.basePrice || 0,
    date: order.date,
    time: order.time,
    serviceIcon: getServiceVector(order.serviceType || order.service),
    isSelected: order.id === focusedOrderId
  })), [orders, focusedOrderId]);

  const finalPins = externalPins || internalPins;
  const focusedOrder = useMemo(() => orders.find(o => o.id === focusedOrderId), [orders, focusedOrderId]);

  // Freeze initial location — only set once so map never snaps back on re-render
  if (!frozenInitialLocation.current && finalPins.length > 0) {
    frozenInitialLocation.current = { lat: finalPins[0].lat, lng: finalPins[0].lng };
  }

  return (
    <div className="relative w-full h-full bg-neutral-50">
      <MapView
        initialLocation={frozenInitialLocation.current}
        onLocationChange={() => { }}
        broadcastPins={finalPins}
        focusedOrderId={focusedOrderId}
        onOrderClick={(id) => {
          // Search internal orders first, then fallback to passed-in orderData
          const order = orders.find(o => o.id === id) || (orderData || []).find((o: any) => o.id === id);
          if (order) onSelectOrder(order);
        }}
        onInteractionStart={() => {
          setIsInteracting(true);
          setFocusedOrderId(null);
          onInteractionStart?.();
        }}
        onInteractionEnd={() => {
          setIsInteracting(false);
          onInteractionEnd?.();
        }}
        interactive={true}
        pinY={25}
        zoom={13}
        showCenterPin={false}
        centerAddress={undefined}
        userPosition={null}
        flyToPoint={requestedFlyTo}
        triggerGps={triggerGps}
        currentUserPin={currentUserPin}
      />

      {/* Floating Header - Adjusted for no global header */}
      <div className="absolute top-[60px] left-6 right-6 z-10 flex justify-between items-start pointer-events-none">


        <button
          onClick={onShowNotifications}
          className="w-12 h-12 flex items-center justify-center text-black relative active:scale-90 transition-transform bg-white/90 backdrop-blur-md rounded-full border border-neutral-100 pointer-events-auto"
        >
          <Bell size={24} strokeWidth={2.5} />
          {notificationsCount > 0 && (
            <span className="absolute top-[12px] right-[12px] h-3 w-3 rounded-full bg-[#E51B24] border-2 border-white" />
          )}
        </button>
      </div>
    </div>
  );
}
