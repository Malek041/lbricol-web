"use client";

import React from 'react';
import { Edit2, MapPin, Home, Briefcase, Sofa } from 'lucide-react';
import { SavedAddress } from './types';

import AddressRow from './AddressRow';

interface SavedAddressListProps {
  addresses: SavedAddress[];
  onSelect: (addr: SavedAddress) => void;
  onEdit: (addr: SavedAddress) => void;
  onAdd: () => void;
  title?: string;
}

const SavedAddressList: React.FC<SavedAddressListProps> = ({
  addresses,
  onSelect,
  onEdit,
  onAdd,
  title = "What's your current location?"
}) => {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[22px] font-[800] text-[#111827] mb-5 tracking-[-0.3px]">
        {title}
      </h3>

      <div className="flex-1 -mx-1 px-1">
        {addresses.map((addr) => (
          <AddressRow
            key={addr.id}
            address={addr}
            onSelect={onSelect}
            onEdit={onEdit}
          />
        ))}
      </div>

      <button
        onClick={onAdd}
        className="w-full mt-5 h-[52px] rounded-full bg-[#F0FDF4] text-[#017C3E] font-[700] text-[20px] hover:bg-[#DCFCE7] transition-all flex items-center justify-center"
      >
        Add a new address
      </button>
    </div>
  );
};

export default SavedAddressList;
