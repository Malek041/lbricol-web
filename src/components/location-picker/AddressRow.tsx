"use client";

import React from 'react';
import { Pencil, Navigation, Building2, Sofa } from 'lucide-react';
import { SavedAddress } from './types';

interface AddressRowProps {
  address: SavedAddress;
  onSelect: (addr: SavedAddress) => void;
  onEdit: (addr: SavedAddress) => void;
}

const AddressRow: React.FC<AddressRowProps> = ({ address, onSelect, onEdit }) => {
  const getIcon = () => {
    switch (address.label) {
      case 'Home': return <Navigation size={18} className="text-[#374151] rotate-45" />;
      case 'Flat': return <Building2 size={18} className="text-[#374151]" />;
      case 'Garden': return <Sofa size={18} className="text-[#374151]" />;
      case 'Office': return <Building2 size={18} className="text-[#374151]" />;
      case 'Hotel':
      case 'Riad':
      case 'Guesthouse': return <Building2 size={18} className="text-[#374151]" />;
      default: return <Navigation size={18} className="text-[#374151]" />;
    }
  };


  return (
    <div 
      className="flex items-center gap-4 py-4 cursor-pointer active:bg-neutral-50 transition-colors border-b border-[#F3F4F6] last:border-none"
      onClick={() => onSelect(address)}
    >
      {/* Rounded Square Icon Container */}
      <div className="w-10 h-10 rounded-[10px] bg-[#F3F4F6] flex items-center justify-center flex-shrink-0">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col">
          <p className="text-[15px] font-semibold text-[#111827] leading-tight flex items-center gap-1.5">
            {address.label === 'Other' && address.customLabel ? address.customLabel : address.label} · {address.address.split(',')[0]}
          </p>
          
          <div className="flex flex-col gap-0.5 mt-0.5">
             <p className="text-[13px] text-[#6B7280] truncate">
              {address.buildingName || 'No details added'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit button — circle with border */}
      <button 
        className="w-9 h-9 border-[1.5px] border-[#E5E7EB] rounded-full flex items-center justify-center text-[#6B7280] hover:border-neutral-300 transition-all flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(address);
        }}
      >
        <Pencil size={16} />
      </button>
    </div>
  );
};

export default AddressRow;
