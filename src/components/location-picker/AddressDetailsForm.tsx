"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, X, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LocationPoint, SavedAddress, AddressLabel } from './types';

// Dynamically import MapView to avoid SSR issues for the thumbnail
const MapView = dynamic(() => import('./MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

interface AddressDetailsFormProps {
  initialData: Partial<SavedAddress> & { lat: number, lng: number, address: string };
  onSave: (data: SavedAddress) => void;
  onBack: () => void;
}

const AddressDetailsForm: React.FC<AddressDetailsFormProps> = ({ initialData, onSave, onBack }) => {
  const [formData, setFormData] = useState({
    buildingName: initialData.buildingName || '',
    floorNumber: initialData.floorNumber || '',
    doorNumber: initialData.doorNumber || '',
    additionalInfo: initialData.additionalInfo || '',
    label: initialData.label || 'Home' as AddressLabel,
  });

  const [isMarked, setIsMarked] = useState(true); // Assuming initial point is marked

  const handleSave = () => {
    onSave({
      id: initialData.id || Math.random().toString(36).substr(2, 9),
      address: initialData.address,
      lat: initialData.lat,
      lng: initialData.lng,
      ...formData,
    });
  };

  const labelOptions: AddressLabel[] = ['Home', 'Flat', 'Garden', 'Custom'];

  return (
    <div className="fixed inset-0 bg-white z-[2100] flex flex-col font-jakarta overflow-y-auto">
      {/* Header */}
      <div className="flex items-center px-4 h-14 border-b border-[#F3F4F6] sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-[#111827]">
          <ArrowLeft size={24} />
        </button>
        <h2 className="flex-1 text-center font-bold text-[17px] mr-8">
          Address details
        </h2>
      </div>

      <div className="p-5 space-y-6 pb-24">
        {/* Address Preview */}
        <div className="flex items-start gap-3">
          <div className="mt-1 text-[#6B7280]">
            <Building2 size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-bold text-[#111827] leading-tight break-words">
              {initialData.address}
            </p>
            <p className="text-[14px] text-[#6B7280] mt-1">
              {[formData.buildingName, formData.floorNumber, formData.doorNumber].filter(Boolean).join(', ') || 'No details yet'}
            </p>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          {/* Building Name */}
          <div className="relative group">
             <div className="border border-[#E5E7EB] focus-within:border-[#10B981] rounded-xl h-14 transition-all relative">
                <input 
                  type="text"
                  value={formData.buildingName}
                  onChange={(e) => setFormData({...formData, buildingName: e.target.value})}
                  className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium"
                />
                <label className={`absolute left-4 transition-all pointer-events-none text-[#6B7280] ${formData.buildingName ? 'top-1.5 text-[11px] font-bold' : 'top-4 text-[15px]'}`}>
                  Building name
                </label>
                {formData.buildingName && (
                  <button 
                    onClick={() => setFormData({...formData, buildingName: ''})}
                    className="absolute right-3 top-4 text-[#9CA3AF]"
                  >
                    <X size={18} />
                  </button>
                )}
             </div>
          </div>

          {/* Floor & Door Side-by-Side */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <div className="border border-[#E5E7EB] focus-within:border-[#10B981] rounded-xl h-14 transition-all relative">
                <input 
                  type="text"
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({...formData, floorNumber: e.target.value})}
                  className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium"
                />
                <label className={`absolute left-4 transition-all pointer-events-none text-[#6B7280] ${formData.floorNumber ? 'top-1.5 text-[11px] font-bold' : 'top-4 text-[15px]'}`}>
                  Floor number
                </label>
                {formData.floorNumber && (
                   <button 
                    onClick={() => setFormData({...formData, floorNumber: ''})}
                    className="absolute right-3 top-4 text-[#9CA3AF]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <span className={`text-[11px] ml-1 ${formData.floorNumber ? 'text-[#6B7280]' : 'text-red-500 font-medium'}`}>
                Required
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <div className="border border-[#E5E7EB] focus-within:border-[#10B981] rounded-xl h-14 transition-all relative">
                <input 
                  type="text"
                  value={formData.doorNumber}
                  onChange={(e) => setFormData({...formData, doorNumber: e.target.value})}
                  className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium"
                />
                <label className={`absolute left-4 transition-all pointer-events-none text-[#6B7280] ${formData.doorNumber ? 'top-1.5 text-[11px] font-bold' : 'top-4 text-[15px]'}`}>
                  Door number
                </label>
                 {formData.doorNumber && (
                   <button 
                    onClick={() => setFormData({...formData, doorNumber: ''})}
                    className="absolute right-3 top-4 text-[#9CA3AF]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <span className={`text-[11px] ml-1 ${formData.doorNumber ? 'text-[#6B7280]' : 'text-red-500 font-medium'}`}>
                Required
              </span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="border border-[#E5E7EB] focus-within:border-[#10B981] rounded-xl h-24 transition-all overflow-hidden relative">
            <textarea 
              value={formData.additionalInfo}
              onChange={(e) => setFormData({...formData, additionalInfo: e.target.value})}
              placeholder="Additional information"
              className="w-full h-full p-4 bg-transparent outline-none text-[15px] font-medium resize-none placeholder:text-[#9CA3AF] placeholder:font-normal"
            />
          </div>
        </div>

        {/* Mark Entrance */}
        <div className="space-y-3">
          <div className="flex flex-col">
            <h3 className="text-[17px] font-bold text-[#111827]">Mark your entrance</h3>
            <div className="flex items-center gap-1.5 text-[#10B981] mt-0.5">
              <CheckCircle2 size={16} />
              <p className="text-[13px] font-medium">Done! Thanks for helping the courier</p>
            </div>
          </div>
          <div className="w-full h-[140px] rounded-xl overflow-hidden border border-[#F3F4F6]">
            {/* Minimal Map Preview */}
            <MapView 
              initialLocation={{ lat: initialData.lat, lng: initialData.lng }}
              onLocationChange={() => {}} // Non-interactive thumbnail
            />
            {/* Fixed Pin Overlay for Thumbnail */}
            <div className="absolute left-1/2 bottom-[calc(50%+4px)] -translate-x-1/2 z-20 pointer-events-none">
               <svg width="24" height="32" viewBox="0 0 44 58" fill="none">
                  <path d="M22 0C10.4 0 1 9.4 1 21C1 36.5 22 58 22 58C22 58 43 36.5 43 21C43 9.4 33.6 0 22 0Z" fill="#0D6B52" />
                  <circle cx="22" cy="21" r="8" fill="white" />
              </svg>
            </div>
          </div>
        </div>

        {/* Add Label */}
        <div className="space-y-3">
          <div>
            <h3 className="text-[17px] font-bold text-[#111827]">Add a label</h3>
            <p className="text-[13px] text-[#6B7280]">Identify this address more easily next time</p>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
            {labelOptions.map(l => (
              <button
                key={l}
                onClick={() => setFormData({...formData, label: l})}
                className={`h-11 px-6 rounded-full text-[14px] font-bold transition-all border ${
                  formData.label === l 
                  ? 'bg-[#F2C94C] border-[#F2C94C] text-[#111827]' 
                  : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#F3F4F6] z-20">
        <button
          onClick={handleSave}
          disabled={!formData.floorNumber || !formData.doorNumber}
          className="w-full h-14 rounded-full bg-[#10B981] text-white font-bold text-[17px] shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          Save address
        </button>
      </div>
    </div>
  );
};

export default AddressDetailsForm;
