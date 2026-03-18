"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, Loader2, Navigation, Search, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LocationPickerProps, LocationPoint, SavedAddress } from './types';

// Components
import AddressCard from './AddressCard';
import SavedAddressList from './SavedAddressList';
import AddressDetailsForm from './AddressDetailsForm';
import AddressSearch from './AddressSearch';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

type PickerView = 'MAP' | 'DETAILS' | 'SEARCH';
const EMPTY_ARRAY: SavedAddress[] = [];

const LocationPicker: React.FC<LocationPickerProps> = ({
  mode,
  serviceType,
  serviceIcon = '🚲',
  title,
  savedAddresses: initialSavedAddresses = EMPTY_ARRAY,
  onConfirm,
  onClose,
  autoLocate,
  onSaveAddress,
  onDeleteAddress,
  isInline = false,
  onConfirmRadius,
  initialRadius = 10,
  pinImage,
}) => {
  // Views & State
  const [activeView, setActiveView] = useState<PickerView>('MAP');
  const [currentPoint, setCurrentPoint] = useState<LocationPoint | null>(null);
  const [selectedForDetails, setSelectedForDetails] = useState<Partial<SavedAddress> & { lat: number, lng: number, address: string } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(initialSavedAddresses);

  // Interaction State
  const [pickupPoint, setPickupPoint] = useState<LocationPoint | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [triggerGps, setTriggerGps] = useState(0);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [flyToPoint, setFlyToPoint] = useState<LocationPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [radiusView, setRadiusView] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(initialRadius);

  const isBricolerBase = serviceType === 'bricoler-base';

  // Sync local addresses with props
  useEffect(() => {
    setSavedAddresses(initialSavedAddresses);
  }, [initialSavedAddresses]);

  // Auto-locate on mount if requested
  useEffect(() => {
    if (autoLocate && !hasAutoLocated) {
      handleLocate();
      setHasAutoLocated(true);
    }
  }, [autoLocate, hasAutoLocated]);

  // View A (Map) Actions
  const handleLocationChange = (point: LocationPoint) => {
    setCurrentPoint(point);
    setIsLocating(false);
  };

  const handleLocate = () => {
    setIsManualSelection(false);
    setIsLocating(true);
    setTriggerGps(Date.now());
  };

  const handleConfirmPoint = () => {
    if (!currentPoint) return;
    setIsManualSelection(true);

    if (isBricolerBase) {
      if (onConfirmRadius) {
        setRadiusView(true);
      } else {
        onConfirm({ pickup: currentPoint });
      }
      return;
    }

    if (mode === 'double') {
      if (step === 1) {
        setPickupPoint(currentPoint);
        setStep(2);
        // The bubble will stay since currentPoint is still the same
        return;
      } else {
        onConfirm({ pickup: pickupPoint!, dropoff: currentPoint });
        return;
      }
    }

    // When using map point, go to Details View first to save/confirm
    setSelectedForDetails({
      address: currentPoint.address,
      lat: currentPoint.lat,
      lng: currentPoint.lng,
      label: 'Home'
    });
    setActiveView('DETAILS');
  };

  const handleSavedSelect = (addr: SavedAddress) => {
    const point = { lat: addr.lat, lng: addr.lng, address: addr.address };
    setIsManualSelection(true);
    setFlyToPoint(point);

    if (mode === 'single') {
      onConfirm({ pickup: point, savedAddress: addr });
    } else {
      if (step === 1) {
        setPickupPoint(point);
        setStep(2);
      } else {
        onConfirm({ pickup: pickupPoint!, dropoff: point });
      }
    }
  };

  const handleEditAddress = (addr: SavedAddress) => {
    setSelectedForDetails(addr);
    setActiveView('DETAILS');
  };

  // View B (Details) Actions
  const handleSaveDetails = (data: SavedAddress) => {
    // 1. Update/Add to local saved list
    const exists = savedAddresses.find(a => a.id === data.id);
    let updatedList: SavedAddress[];
    if (exists) {
      updatedList = savedAddresses.map(a => a.id === data.id ? data : a);
    } else {
      updatedList = [data, ...savedAddresses];
    }
    setSavedAddresses(updatedList);
    onSaveAddress?.(data);

    // 2. Auto-confirm/select this address to finalize the flow
    onConfirm({
      pickup: { lat: data.lat, lng: data.lng, address: data.address },
      savedAddress: data
    });

    // 3. Return to Map View (or the picker might be closed by parent onConfirm)
    setActiveView('MAP');
    setSelectedForDetails(null);
  };

  // View C (Search) Actions
  const handleSearchSelect = (lat: number, lng: number, address: string) => {
    setIsManualSelection(true);
    setFlyToPoint({ lat, lng, address });

    if (isBricolerBase) {
      setActiveView('MAP');
      setShowSearchInput(false);
      return;
    }

    setSelectedForDetails({ lat, lng, address, label: 'Home' });
    // Go directly to details as per spec, MapView thumbnail will show the location
    setActiveView('DETAILS');
  };

  if (activeView === 'SEARCH') {
    return <AddressSearch onBack={() => setActiveView('MAP')} onSelect={handleSearchSelect} />;
  }

  if (activeView === 'DETAILS' && selectedForDetails) {
    return <AddressDetailsForm
      initialData={selectedForDetails}
      onBack={() => setActiveView('MAP')}
      onSave={handleSaveDetails}
    />;
  }

  return (
    <div className={cn(
      "bg-white flex flex-col font-jakarta transition-all overflow-hidden",
      isInline ? "relative w-full h-full" : "fixed inset-0 z-[6000]"
    )}>
      {/* 1. Map Area (Fixed Height) */}
      <div
        className={cn(
          "relative bg-neutral-100 overflow-hidden transition-all duration-500 ease-in-out z-0 shrink-0",
          isInteracting ? 'h-[75%]' : (radiusView ? 'h-[58%]' : (isBricolerBase ? 'h-[82%]' : 'h-[48%]'))
        )}
      >
        {/* Full-screen under-layer map */}
        <div className="absolute top-0 left-0 w-full h-[100dvh]">
          <MapView
            onLocationChange={handleLocationChange}
            triggerGps={isManualSelection ? 0 : triggerGps}
            flyToPoint={flyToPoint || undefined}
            onInteractionStart={() => setIsInteracting(true)}
            onInteractionEnd={() => setIsInteracting(false)}
            pinY={30}
          />
        </div>

        {/* Floating Controls (Inside resizable area but sticky) */}
        <div className="absolute inset-0 pointer-events-none z-[1002]">
          {/* X Close Button */}
          <div className="absolute top-4 left-4 pointer-events-auto">
            <button
              onClick={radiusView ? () => setRadiusView(false) : onClose}
              className="w-9 h-9 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-95 transition-transform"
            >
              {radiusView ? (
                <ChevronLeft size={20} className="text-[#374151]" />
              ) : (
                <X size={18} className="text-[#374151]" />
              )}
            </button>
          </div>
          {/* GPS Locate Button */}
          <div className="absolute bottom-12 right-4 pointer-events-auto">
            <button
              onClick={handleLocate}
              className="w-11 h-11 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#374151] active:scale-95 transition-transform"
            >
              {isLocating ? (
                <Loader2 size={20} className="animate-spin text-[#00A082]" />
              ) : (
                <Navigation size={22} strokeWidth={2.5} className="text-neutral-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bottom Sheet Area (Resizable) */}
      <div className="flex-1 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-5 py-8 flex flex-col overflow-hidden relative z-10 -mt-8">
        {isBricolerBase ? (
          <div className="flex flex-col h-full">
            <AnimatePresence mode="wait">
              {radiusView ? (
                <motion.div
                  key="radius-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Service Radius</h3>
                    <p className="text-neutral-500 text-[14px] font-medium leading-relaxed">
                      How far are you willing to travel for tasks?
                    </p>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {[3, 5, 10, 20, 50].map(radius => (
                      <button
                        key={radius}
                        onClick={() => {
                          setSelectedRadius(radius);
                          if (currentPoint) {
                            onConfirm({ pickup: currentPoint });
                            onConfirmRadius?.(radius);
                          }
                        }}
                        className={cn(
                          "py-3 rounded-[12px] border-2 text-center transition-all flex flex-col items-center justify-center",
                          selectedRadius === radius ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : 'bg-white text-neutral-900 border-neutral-100 hover:border-neutral-200'
                        )}
                      >
                        <span className="text-lg font-black leading-none">{radius}</span>
                        <span className="text-[10px] font-bold opacity-60 mt-0.5">KM</span>
                      </button>
                    ))}
                  </div>

                </motion.div>
              ) : !showSearchInput ? (
                <motion.div
                  key="confirm-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4 mt-4"
                >
                  <button
                    onClick={handleConfirmPoint}
                    className="w-full h-15 bg-[#00A082] text-white rounded-full font-black text-[18px] active:scale-95 transition-all shadow-lg"
                  >
                    Confirm This Location
                  </button>
                  <button
                    onClick={() => setShowSearchInput(true)}
                    className="w-full mt-4 text-[#00A082] font-bold text-[18px] transition-all"
                  >
                    Set Another address
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="search-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  <div className="relative">
                    <button
                      onClick={() => setShowSearchInput(false)}
                      className="absolute -top-1 -left-2 p-2 text-neutral-400 hover:text-neutral-600 active:scale-90 transition-all"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <p className="text-center text-[15px] font-medium text-neutral-600">
                      Trouble locating your address?<br />Try using search instead
                    </p>
                  </div>

                  <div
                    onClick={() => setActiveView('SEARCH')}
                    className="flex items-center gap-3 px-6 py-4 bg-[#F9FAFB] border border-neutral-100 rounded-full cursor-pointer hover:bg-neutral-100 transition-all group"
                  >
                    <Search size={22} className="text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                    <span className="text-neutral-400 font-medium text-[16px] group-hover:text-neutral-600 transition-colors">
                      Search street, city, district...
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            <SavedAddressList
              addresses={savedAddresses}
              onSelect={handleSavedSelect}
              onEdit={handleEditAddress}
              onAdd={() => setActiveView('SEARCH')}
              title={mode === 'double' && step === 2 ? "Where are you moving to?" : "Where do you need help?"}
            />

            <p className="text-center text-[12px] text-[#9CA3AF] mt-4 font-medium">
              Trouble locating your address? Try using search instead
            </p>
          </>
        )}
      </div>

      {/* 3. TRULY FIXED PIN & CALLOUT — Always in visual center of initial view */}
      <motion.div
        className={cn(
          "left-1/2 -translate-x-1/2 pointer-events-none z-[6001] transition-all duration-500 ease-in-out",
          isInline ? "absolute" : "fixed"
        )}
        style={{ top: '30%' }}
        animate={{ y: [0, -12, 0] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="relative">
          {/* The Address Bubble (appears above the pin) */}
          {currentPoint && (
            <div className="absolute bottom-[65px] left-1/2 -translate-x-1/2 min-w-max">
              <AddressCard
                address={currentPoint.address}
                icon={serviceIcon}
                onConfirm={handleConfirmPoint}
              />
            </div>
          )}

          {/* The Pin Image - anchored at the bottom-center point */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex justify-center w-[45px]">
            <img
              src={pinImage || "/Images/map Assets/LocationPin.png"}
              alt="Pin"
              className="w-full h-auto drop-shadow-lg"
            />
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default LocationPicker;
