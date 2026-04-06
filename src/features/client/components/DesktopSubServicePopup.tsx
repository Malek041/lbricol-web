"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Info } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { getServiceById, getServiceVector } from '@/config/services_config';

interface DesktopSubServicePopupProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string | null;
  onSelectSubService: (serviceId: string, sub: any) => void;
}

export const DesktopSubServicePopup: React.FC<DesktopSubServicePopupProps> = ({
  isOpen,
  onClose,
  serviceId,
  onSelectSubService
}) => {
  const { t } = useLanguage();
  if (!serviceId) return null;

  const config = getServiceById(serviceId);
  if (!config) return null;

  const serviceIcon = getServiceVector(serviceId);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl flex max-h-[85vh]"
          >
            {/* Left side: Sub-services list */}
            <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-3xl font-black text-black mb-2 tracking-tight">
                    {t({ en: `Choose your ${config.name} service`, fr: `Choisissez votre service de ${config.name}` })}
                  </h2>
                  <p className="text-neutral-500 font-medium">
                    {t({ en: 'Select a specific task to continue', fr: 'Sélectionnez une tâche spécifique pour continuer' })}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3">
                {config.subServices.map((sub: any) => (
                  <button
                    key={sub.id || sub.name}
                    onClick={() => onSelectSubService(serviceId, { id: sub.id, en: sub.name, fr: sub.desc?.fr || sub.name })}
                    className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-neutral-100 hover:border-[#FFCC02] hover:bg-[#FFF9E5] transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#FFF9E5]">
                         <img src={serviceIcon} alt="" className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <div className="font-bold text-[17px] text-black">
                          {t({ en: sub.name, fr: sub.desc?.fr || sub.name })}
                        </div>
                        <div className="text-xs font-semibold text-neutral-400 mt-0.5">
                           {t({ en: 'Professional quality', fr: 'Qualité professionnelle' })}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-neutral-300 group-hover:text-[#FFCC02] transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Image and details */}
            <div className="w-[380px] bg-[#F8F9FA] p-8 flex flex-col items-center justify-center text-center border-l border-neutral-100">
               <div className="w-64 h-64 mb-8">
                  <img 
                    src={serviceIcon} 
                    alt={config.name}
                    className="w-full h-full object-contain"
                  />
               </div>
               <h3 className="text-2xl font-black text-black mb-4">
                 {t({ en: config.name, fr: config.name })}
               </h3>
               <p className="text-neutral-500 font-medium leading-relaxed mb-8">
                 {t({ 
                   en: 'Trusted professionals available in your city. Program your order in less than a minute.',
                   fr: 'Professionnels de confiance disponibles dans votre ville. Programmez votre commande en moins d\'une minute.'
                 })}
               </p>
               <div className="mt-auto flex items-center gap-2 text-sm font-bold text-[#01C167] bg-[#E7F9F0] px-4 py-2 rounded-full">
                  <Info size={16} />
                  {t({ en: 'Quality Guaranteed', fr: 'Qualité Garantie' })}
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
