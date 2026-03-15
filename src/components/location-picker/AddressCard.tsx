"use client";

import React from 'react';

interface AddressCardProps {
  address: string;
  icon?: string;
  onConfirm: () => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, icon = '🚲', onConfirm }) => {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-[1001] pointer-events-auto min-w-[200px] max-w-[280px]">
      <div className="bg-white rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] p-2.5 flex items-center gap-3 border border-neutral-100 whitespace-nowrap">
        {/* Service icon */}
        <div className="w-9 h-9 flex-shrink-0 bg-neutral-50 rounded-[8px] flex items-center justify-center text-lg">
          {icon}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          {/* Address — Animated Emergence */}
          <p key={address} className="text-[14px] font-[800] text-[#111827] leading-tight truncate animate-text-reveal">
            {address}
          </p>
          {/* CTA */}
          <button
            onClick={onConfirm}
            className="text-[13px] font-[700] text-[#0D9488] mt-0.5 hover:text-[#0f766e] transition-colors cursor-pointer block"
          >
            Use this point
          </button>
        </div>

        {/* Little triangle pointer at the bottom */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-neutral-100 rotate-45" />
      </div>
      <style jsx>{`
        @keyframes textReveal {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-text-reveal {
          animation: textReveal 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AddressCard;
