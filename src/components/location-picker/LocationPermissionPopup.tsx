"use client";

import React from 'react';
import { MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationPermissionPopupProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const LocationPermissionPopup: React.FC<LocationPermissionPopupProps> = ({ isOpen, onAllow, onDeny }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={onDeny}
          />
          
          {/* Popup Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-[320px] rounded-[24px] overflow-hidden shadow-2xl flex flex-col font-jakarta"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#F0FDF4] rounded-full flex items-center justify-center mb-6">
                <MapPin size={24} className="text-[#10B981]" />
              </div>
              
              <h2 className="text-[20px] font-extrabold text-[#111827] leading-tight mb-3">
                Autoriser Lbricol à accéder à la position de cet appareil ?
              </h2>
              
              <p className="text-[14px] text-[#6B7280] leading-relaxed mb-6">
                Pour vous montrer les meilleurs services et bricoleurs à proximité.
              </p>
            </div>
            
            <div className="flex flex-col border-t border-[#F3F4F6]">
              <button 
                onClick={onAllow}
                className="w-full py-4 text-[15px] font-bold text-[#10B981] active:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6]"
              >
                LORSQUE VOUS UTILISEZ L'APPLICATION
              </button>
              
              <button 
                onClick={onAllow}
                className="w-full py-4 text-[15px] font-bold text-[#10B981] active:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6]"
              >
                UNIQUEMENT CETTE FOIS-CI
              </button>
              
              <button 
                onClick={onDeny}
                className="w-full py-4 text-[15px] font-bold text-[#6B7280] active:bg-[#F9FAFB] transition-colors"
              >
                NE PAS AUTORISER
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionPopup;
