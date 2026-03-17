"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Locate } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LocationPoint } from './types';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

interface EntrancePickerProps {
  initialLocation: { lat: number; lng: number };
  onConfirm: (location: LocationPoint) => void;
  onBack: () => void;
}

const EntrancePicker: React.FC<EntrancePickerProps> = ({ initialLocation, onConfirm, onBack }) => {
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [triggerGps, setTriggerGps] = useState(0);

  const handleLocationChange = (point: LocationPoint) => {
    setCurrentLocation(point);
  };

  const handleInteractionStart = () => {
    setHasMoved(true);
  };

  return (
    <div className="fixed inset-0 bg-white z-[2200] flex flex-col font-jakarta">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 h-14 pointer-events-none">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 rounded-full bg-white shadow-md text-[#111827] pointer-events-auto active:scale-95 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapView
          initialLocation={initialLocation}
          onLocationChange={handleLocationChange}
          onInteractionStart={handleInteractionStart}
          triggerGps={triggerGps}
          pinY={50} // Centered for entrance picking
          zoom={17}
        />

        {/* Floating Instructions Card */}
        <div className="absolute top-20 left-4 right-4 z-20">
          <div className="bg-white rounded-2xl p-4 shadow-xl border border-neutral-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 flex-shrink-0 bg-[#F9FAFB] rounded-xl overflow-hidden relative flex items-center justify-center border border-[#F3F4F6]">
              {/* Simple Helmet Courier Illustration */}
              <div className="relative">
                {/* Thinking bubble */}
                <div className="absolute -top-3 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100">
                  <span className="text-[12px] font-bold text-[#6B7280]">?</span>
                </div>
                {/* Courier Head/Helmet */}
                <div className="w-10 h-10 bg-[#FFD600] rounded-xl border-[1.5px] border-black flex flex-col items-center overflow-hidden">
                    <div className="w-full h-1/2 bg-black opacity-80 mt-1"></div>
                </div>
                {/* Courier Bag */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#FF6B6B] rounded-md border border-black shadow-sm"></div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-[#111827]">
                {hasMoved ? "This will help :)" : "Point to the entrance"}
              </h3>
              <p className="text-[13px] text-[#6B7280] leading-tight mt-1">
                {hasMoved 
                  ? "Make sure the pin is on the street and confirm!" 
                  : "This helps the courier to reach you faster"}
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Lbricol Yellow Pin — CSS centered, does not move */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(100%-4px)] z-20 pointer-events-none flex flex-col items-center">
          <img 
            src="/Images/map Assets/locationPinYellowOnly.png" 
            alt="entrance pin"
            className="w-[40px] h-auto drop-shadow-lg"
          />
          {/* Subtle Shadow at the point of the pin */}
          <div className="w-1.5 h-1 bg-black/20 rounded-full blur-[1px] -mt-1"></div>
        </div>

        {/* GPS Button */}
        <button 
          onClick={() => setTriggerGps(Date.now())}
          className="absolute right-4 bottom-24 p-3 bg-white rounded-full shadow-lg text-[#111827] z-20 active:scale-95 transition-transform"
        >
          <Locate size={24} />
        </button>
      </div>

      {/* Confirm Button */}
      <div className="p-4 pb-8 bg-white border-t border-[#F3F4F6] z-20">
        <button
          onClick={() => currentLocation && onConfirm(currentLocation)}
          disabled={!hasMoved}
          className={`w-full h-14 rounded-full font-bold text-[17px] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center
            ${hasMoved 
              ? 'bg-[#10B981] text-white' 
              : 'bg-[#D1D5DB] text-white cursor-not-allowed'}
          `}
        >
          Confirm entrance
        </button>
      </div>
    </div>
  );
};

export default EntrancePicker;
