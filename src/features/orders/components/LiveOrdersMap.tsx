"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  broadcastPins: externalPins
}: LiveOrdersMapProps) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [requestedFlyTo, setRequestedFlyTo] = useState<{ lat: number, lng: number } | undefined>(undefined);

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
    rating: order.clientRating || 5.0,
    serviceIcon: getServiceVector(order.serviceType || order.service),
    isSelected: order.id === focusedOrderId
  })), [orders, focusedOrderId]);

  const finalPins = externalPins || internalPins;
  const focusedOrder = useMemo(() => orders.find(o => o.id === focusedOrderId), [orders, focusedOrderId]);

  return (
    <div className="relative w-full h-full bg-neutral-50">
      <MapView
        initialLocation={finalPins.length > 0 ? { lat: finalPins[0].lat, lng: finalPins[0].lng } : undefined}
        onLocationChange={() => { }}
        broadcastPins={finalPins}
        focusedOrderId={focusedOrderId}
        onOrderClick={(id) => setFocusedOrderId(id)}
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
        zoom={15}
        showCenterPin={false}
        centerAddress={undefined}
        userPosition={null}
        flyToPoint={requestedFlyTo}
        triggerGps={triggerGps}
        currentUserPin={currentUserPin}
      />

      {/* Floating Header - Adjusted for no global header */}
      <div className="absolute top-[60px] left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-white/20 flex items-center gap-2 pointer-events-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[13px] font-black text-neutral-800">
            {orders.length} {t({ en: 'Live Missions', fr: 'Missions en direct', ar: 'مهام مباشرة' })}
          </span>
        </div>

        <button
          onClick={onShowNotifications}
          className="w-12 h-12 flex items-center justify-center text-black relative active:scale-90 transition-transform bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/20 pointer-events-auto"
        >
          <Bell size={24} strokeWidth={2.5} />
          {notificationsCount > 0 && (
            <span className="absolute top-[12px] right-[12px] h-3 w-3 rounded-full bg-[#E51B24] border-2 border-white" />
          )}
        </button>
      </div>

      {/* Order Mini-Card */}
      <AnimatePresence>
        {focusedOrder && !isInteracting && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-4 left-4 right-4 z-20"
          >
            <div
              onClick={() => onSelectOrder(focusedOrder)}
              className="bg-white rounded-[20px] p-4 shadow-xl border border-neutral-100 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <img src={getServiceVector(focusedOrder.serviceType || focusedOrder.service)} className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-black text-neutral-900 truncate uppercase tracking-tight">
                  {focusedOrder.serviceName || focusedOrder.service}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-neutral-500">
                    <MapPin size={12} className="text-emerald-500" />
                    <span className="text-[12px] font-bold truncate max-w-[120px]">{focusedOrder.location}</span>
                  </div>
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Banknote size={12} className="text-emerald-500" />
                    <span className="text-[12px] font-black text-neutral-900">{focusedOrder.totalPrice || focusedOrder.basePrice} MAD</span>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ChevronRight size={20} strokeWidth={3} />
              </div>

              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusedOrderId(null);
                }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-md border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-600"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
