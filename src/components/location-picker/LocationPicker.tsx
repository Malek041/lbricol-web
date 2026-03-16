"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, Loader2, Navigation } from 'lucide-react';
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

const LocationPicker: React.FC<LocationPickerProps> = ({
  mode,
  serviceType,
  serviceIcon = '🚲',
  title,
  savedAddresses: initialSavedAddresses = [],
  onConfirm,
  onClose,
  autoLocate,
  onSaveAddress,
  onDeleteAddress,
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
  const [flyToPoint, setFlyToPoint] = useState<LocationPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);

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
    setIsLocating(true);
    setTriggerGps(Date.now());
  };

  const handleConfirmPoint = () => {
    if (!currentPoint) return;
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
    if (mode === 'single') {
      onConfirm({ pickup: point, savedAddress: addr });
    } else {
      if (step === 1) {
        setPickupPoint(point);
        setStep(2);
        setFlyToPoint(point); // Fly to the point to show where it is
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
    setFlyToPoint({ lat, lng, address });
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
    <div className="fixed inset-0 bg-white z-[6000] flex flex-col font-jakarta transition-all overflow-hidden">
      {/* 1. Map Area (Fixed Height) */}
      <div className="relative h-[48%] bg-neutral-100 overflow-hidden z-0 shrink-0">
        {/* Full-screen under-layer map */}
        <div className="absolute top-0 left-0 w-full h-[100dvh]">
            <MapView
                onLocationChange={handleLocationChange}
                triggerGps={triggerGps}
                flyToPoint={flyToPoint || undefined}
                onInteractionStart={() => setIsInteracting(true)}
                onInteractionEnd={() => setIsInteracting(false)}
                pinY={24}
            />
        </div>

        {/* Floating Controls (Inside resizable area but sticky) */}
        <div className="absolute inset-0 pointer-events-none z-[1002]">
          {/* X Close Button */}
          <div className="absolute top-4 left-4 pointer-events-auto">
            <button
              onClick={onClose}
              className="w-9 h-9 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-95 transition-transform"
            >
              <X size={18} className="text-[#374151]" />
            </button>
          </div>
          {/* GPS Locate Button */}
          <div className="absolute bottom-4 right-4 pointer-events-auto">
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
      </div>

      {/* 3. TRULY FIXED PIN & CALLOUT — Always in visual center of initial view */}
      <div
        className="fixed left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[6001] transition-all duration-300 ease-in-out"
        style={{ top: '24%' }}
      >
        {/* The Address Bubble (appears above the pin) */}
        {currentPoint && (
          <AddressCard
            address={currentPoint.address}
            icon={serviceIcon}
            onConfirm={handleConfirmPoint}
          />
        )}

        {/* The Pin Image */}
        <div className="flex justify-center">
            <img
                src="/Images/map Assets/LocationPin.png"
                alt="Pin"
                className="w-[45px] h-auto drop-shadow-lg"
            />
        </div>
      </div>

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
