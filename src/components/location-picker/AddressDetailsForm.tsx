"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, X, CheckCircle2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { LocationPoint, SavedAddress, AddressLabel } from './types';
import EntrancePicker from './EntrancePicker';

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
    entranceLat: initialData.entranceLat,
    entranceLng: initialData.entranceLng,
  });

  const [isPickingEntrance, setIsPickingEntrance] = useState(false);
  const [isMarked, setIsMarked] = useState(true); // Default to true as per Pic 2 starting state

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
      <div className="flex items-center px-4 h-14 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-[#111827]">
          <ArrowLeft size={24} />
        </button>
        <h2 className="flex-1 text-left pl-5 font-bold text-[17px] mr-8">
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
            <p className="text-[16px] font-light text-[#111827] leading-tight break-words">
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
            <div className="border border-[2px] border-[#D9D9D9] focus-within:border-[#D9D9D9] rounded-xl h-14 transition-all relative">
              <input
                type="text"
                value={formData.buildingName}
                onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
                className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium"
              />
              <label className={`absolute left-4 transition-all pointer-events-none text-[#6B7280] ${formData.buildingName ? 'top-1.5 text-[11px] font-bold' : 'top-4 text-[15px]'}`}>
                Building name
              </label>
              {formData.buildingName && (
                <button
                  onClick={() => setFormData({ ...formData, buildingName: '' })}
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
              <div className="border border-[2px] border-[#D9D9D9] focus-within:border-[#D9D9D9] rounded-xl h-14 transition-all relative">
                <input
                  type="text"
                  value={formData.floorNumber}
                  onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
                  className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium"
                />
                <label className={`absolute left-4 transition-all pointer-events-none text-[#6B7280] ${formData.floorNumber ? 'top-1.5 text-[11px] font-bold' : 'top-4 text-[15px]'}`}>
                  Floor number
                </label>
                {formData.floorNumber && (
                  <button
                    onClick={() => setFormData({ ...formData, floorNumber: '' })}
                    className="absolute right-3 top-4 text-[#9CA3AF]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

            </div>

            <div className="flex-1 flex flex-col gap-1">
              <div className="border border-[2px] border-[#D9D9D9] focus-within:border-[#D9D9D9] rounded-xl h-14 transition-all relative">
                <input
                  type="text"
                  value={formData.doorNumber}
                  onChange={(e) => setFormData({ ...formData, doorNumber: e.target.value })}
                  className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium"
                />
                <label className={`absolute left-4 transition-all pointer-events-none text-[#6B7280] ${formData.doorNumber ? 'top-1.5 text-[11px] font-bold' : 'top-4 text-[15px]'}`}>
                  Door number
                </label>
                {formData.doorNumber && (
                  <button
                    onClick={() => setFormData({ ...formData, doorNumber: '' })}
                    className="absolute right-3 top-4 text-[#9CA3AF]"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Additional Info */}
          <div className="border border-[2px] border-[#D9D9D9] focus-within:border-[#D9D9D9] rounded-xl h-24 transition-all overflow-hidden relative">
            <textarea
              value={formData.additionalInfo}
              onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
              placeholder="Additional information"
              className="w-full h-full p-4 bg-transparent outline-none text-[15px] font-medium resize-none placeholder:text-[#9CA3AF] placeholder:font-normal"
            />
          </div>
        </div>

        {/* Mark Entrance */}
        <div className="space-y-3">
          <div className="flex flex-col">
            <h3 className="text-[17px] font-bold text-[#111827]">Mark your entrance</h3>
            <div className={`flex items-center gap-1.5 mt-0.5 ${isMarked ? 'text-[#111827]' : 'text-[#111827]'}`}>
              <CheckCircle2 size={16} fill={isMarked ? "#000000ff" : "none"} className={isMarked ? "text-white" : ""} />
              <p className="text-[13px] font-medium">
                {isMarked ? "Done! Thanks for helping the courier" : "Help the courier find the right spot"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPickingEntrance(true)}
            className="w-full h-[160px] rounded-xl overflow-hidden border border-[#F3F4F6] relative active:scale-[0.99] transition-transform text-left"
          >
            {/* Minimal Map Preview */}
            <MapView
              initialLocation={{
                lat: formData.entranceLat || initialData.lat,
                lng: formData.entranceLng || initialData.lng
              }}
              onLocationChange={() => { }} // Non-interactive thumbnail
              interactive={false}
              pinY={50} // Center for snapshot
              zoom={16}
              showCenterPin={true}
            />
            {/* Overlay to catch clicks and prevent map interaction */}
            <div className="absolute inset-0 bg-transparent z-30" />
          </button>
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
                onClick={() => setFormData({ ...formData, label: l })}
                className={`h-11 px-6 rounded-full text-[14px] font-bold transition-all border ${formData.label === l
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
          disabled={!formData.floorNumber || !formData.doorNumber || !isMarked}
          className="w-full h-14 rounded-full bg-[#10B981] text-white font-bold text-[17px] shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          Save address
        </button>
      </div>

      {/* Entrance Picker Overlay */}
      {isPickingEntrance && (
        <EntrancePicker
          initialLocation={{
            lat: formData.entranceLat || initialData.lat,
            lng: formData.entranceLng || initialData.lng
          }}
          onConfirm={(location) => {
            setFormData({
              ...formData,
              entranceLat: location.lat,
              entranceLng: location.lng
            });
            setIsMarked(true);
            setIsPickingEntrance(false);
          }}
          onBack={() => setIsPickingEntrance(false)}
        />
      )}
    </div>
  );
};

export default AddressDetailsForm;
