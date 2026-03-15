"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';

interface AddressBarProps {
  address: string;
  icon?: string;
  onConfirm: () => void;
}

const AddressBar: React.FC<AddressBarProps> = ({ address, icon = '🚲', onConfirm }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1001]">
      <div className="bg-white rounded-t-[20px] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-5 pt-[18px] pb-[28px] min-h-[120px]">
        <div className="flex items-center gap-[14px]">
          {/* Service icon — gray circle bg */}
          <div className="w-11 h-11 flex-shrink-0 bg-[#F3F4F6] rounded-full flex items-center justify-center text-xl">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            {/* Address — dark, bold */}
            <p className="text-[16px] font-bold text-[#111827] leading-[1.3] truncate">
              {address}
            </p>
            {/* CTA — green, separate line */}
            <button
              onClick={onConfirm}
              className="text-[15px] font-bold text-[#10B981] mt-1 hover:text-[#059669] transition-colors cursor-pointer flex items-center gap-1"
            >
              Use this point →
            </button>
          </div>
        </div>

        {/* Hint text below card */}
        <p className="text-center text-[13px] text-[#9CA3AF] mt-3.5 font-medium leading-tight">
          Trouble locating your address? Try using search instead
        </p>
      </div>
      <style jsx>{`
        .animate-slide-up {
          animation: slideUp 0.35s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AddressBar;
