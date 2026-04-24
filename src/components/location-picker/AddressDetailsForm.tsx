"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, X, CheckCircle2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { LocationPoint, SavedAddress, AddressLabel } from './types';
import EntrancePicker from './EntrancePicker';

import { useLanguage } from '@/context/LanguageContext';

// Dynamically import MapView to avoid SSR issues for the thumbnail
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

interface AddressDetailsFormProps {
  initialData: Partial<SavedAddress> & { lat: number, lng: number, address: string };
  onSave: (data: SavedAddress) => void;
  onBack: () => void;
  isHostWizard?: boolean;
}

const AddressDetailsForm: React.FC<AddressDetailsFormProps> = ({ initialData, onSave, onBack, isHostWizard }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    buildingName: initialData.buildingName || '',
    floorNumber: initialData.floorNumber || '',
    doorNumber: initialData.doorNumber || '',
    additionalInfo: initialData.additionalInfo || '',
    label: initialData.label || 'Home' as AddressLabel,
    customLabel: initialData.customLabel || '',
    entranceLat: initialData.entranceLat,
    entranceLng: initialData.entranceLng,
  });

  const [isPickingEntrance, setIsPickingEntrance] = useState(false);
  const [isMarked, setIsMarked] = useState(true);
  const [canInteractWithMap, setCanInteractWithMap] = useState(false);

  // Prevent click-through from previous screen
  useEffect(() => {
    const timer = setTimeout(() => setCanInteractWithMap(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    onSave({
      id: initialData.id || Math.random().toString(36).substr(2, 9),
      address: initialData.address,
      lat: initialData.lat,
      lng: initialData.lng,
      ...formData,
    });
  };

  const labelOptions: AddressLabel[] = ['Home', 'Flat', 'Garden', 'Riad', 'Guesthouse', 'Hotel', 'Office', 'Other'];

  return (
    <div className="fixed inset-0 bg-white z-[10001] flex flex-col font-jakarta overflow-y-auto">
      {/* Header */}
      <div className="flex items-center px-4 h-14 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-[#111827]">
          <ArrowLeft size={24} />
        </button>
        <h2 className="flex-1 text-left pl-5 font-bold text-[17px] mr-8">
          {t({ en: 'Address details', fr: "Détails de l'adresse", ar: "تفاصيل العنوان" })}
        </h2>
      </div>
      <div className="flex flex-col space-y-8 pb-40">
        {/* Input Fields (Now at the top) */}
        <div className="px-5 pt-6">
          <h3 className="text-[20px] font-black text-black mb-6">
            {t({ en: 'Confirm address details', fr: "Confirmer les détails de l'adresse", ar: 'تأكيد تفاصيل العنوان' })}
          </h3>

          <div className="space-y-4">
            {/* Building Name */}
            <div className="relative group">
              <div className="border border-black focus-within:border-black focus-within:bg-white rounded-[12px] h-16 transition-all relative">
                <input
                  type="text"
                  value={formData.buildingName}
                  onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
                  placeholder="e.g. Jardin des Douars"
                  className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-neutral-300"
                />
                <label className="absolute left-4 top-1.5 text-[15px] font-medium transition-all pointer-events-none text-[#2C2C2C]">
                  {t({ en: 'Name of your property', fr: 'Nom de votre propriété', ar: 'اسم مكانك' })}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Floor Number */}
              <div className="relative group">
                <div className="border border-black focus-within:border-black focus-within:bg-white rounded-[12px] h-16 transition-all relative">
                  <input
                    type="text"
                    value={formData.floorNumber}
                    onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
                    placeholder="e.g. 2"
                    className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-neutral-300"
                  />
                  <label className="absolute left-4 top-1.5 text-[15px] font-medium transition-all pointer-events-none text-[#2C2C2C]">
                    {t({ en: 'Floor', fr: 'Étage', ar: 'الطابق' })}
                  </label>
                </div>
              </div>

              {/* Door Number */}
              <div className="relative group">
                <div className="border border-black focus-within:border-black focus-within:bg-white rounded-[12px] h-16 transition-all relative">
                  <input
                    type="text"
                    value={formData.doorNumber}
                    onChange={(e) => setFormData({ ...formData, doorNumber: e.target.value })}
                    placeholder="e.g. 14"
                    className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-neutral-300"
                  />
                  <label className="absolute left-4 top-1.5 text-[15px] font-medium transition-all pointer-events-none text-[#2C2C2C]">
                    {t({ en: 'Apt / Door', fr: 'N° Porte', ar: 'رقم الباب' })}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Preview (Increased height to 450px) */}
        <div className="px-5">
          <div className="relative w-full h-[350px] rounded-[20px] overflow-hidden ">
            <MapView
              initialLocation={{
                lat: formData.entranceLat || initialData.lat,
                lng: formData.entranceLng || initialData.lng
              }}
              onLocationChange={() => { }}
              interactive={false}
              pinY={50}
              zoom={16}
              showCenterPin={true}
            />

            {/* Address Card Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-5 left-4 right-4 z-40 bg-white p-4 rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center gap-3 border border-neutral-100"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center shrink-0">
                <MapPin size={20} className="text-black" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">
                  {t({ en: 'Your Address', fr: 'Votre adresse', ar: 'عنوانك' })}
                </p>
                <p className="text-[14px] text-black font-bold truncate">
                  {initialData.address}
                </p>
              </div>
              <button
                onClick={() => setIsPickingEntrance(true)}
                className="h-10 px-5 bg-black text-white text-[13px] font-bold rounded-full active:scale-95 transition-all"
              >
                {t({ en: 'Refine', fr: 'Préciser', ar: 'تعديل' })}
              </button>
            </motion.div>

            {/* Click overlay - only active after transition delay */}
            {canInteractWithMap && (
              <button
                onClick={() => setIsPickingEntrance(true)}
                className="absolute inset-0 z-30 active:bg-black/5 transition-colors cursor-pointer"
                aria-label="Refine entrance location"
              />
            )}
          </div>
        </div>

        {/* Informative Header Text (Moved to bottom) */}
        <div className="px-5">
          <p className="text-[14px] text-neutral-500 leading-relaxed font-medium">
            {t({
              en: 'We will only share your address after the reservation is confirmed. Until then, travelers will see an approximate location.',
              fr: "Nous ne communiquerons votre adresse qu'après la réservation. En attendant, les voyageurs verront un emplacement approximatif.",
              ar: "لن نشارك عنوانك إلا بعد تأكيد الحجز. حتى ذلك الحين، سيرى المسافرون موقعاً تقريبياً."
            })}
          </p>
        </div>

        {/* Add Label */}
        {!isHostWizard && (
          <div className="px-5 space-y-4">
            <div>
              <h3 className="text-[17px] font-bold text-[#111827]">{t({ en: 'Add a label', fr: 'Ajouter un libellé', ar: 'أضف تسمية' })}</h3>
              <p className="text-[13px] text-[#6B7280]">{t({ en: 'Identify this address more easily next time', fr: 'Identifiez cette adresse plus facilement la prochaine fois', ar: 'حدد هذا العنوان بسهولة أكبر في المرة القادمة' })}</p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
              {labelOptions.map(l => {
                const displayLabel = t({
                  en: l === 'Office' ? 'Office' : l,
                  fr: l === 'Home' ? 'Maison' : l === 'Flat' ? 'Appartement' : l === 'Garden' ? 'Jardin' : l === 'Office' ? 'Bureau' : l === 'Other' ? 'Autre' : l,
                  ar: l === 'Home' ? 'المنزل' : l === 'Flat' ? 'شقة' : l === 'Garden' ? 'حديقة' : l === 'Office' ? 'مكتب' : l === 'Other' ? 'آخر' : l
                });

                return (
                  <button
                    key={l}
                    onClick={() => setFormData({ ...formData, label: l })}
                    className={`flex-shrink-0 min-w-[115px] h-14 flex items-center justify-center rounded-[12px] px-4 text-center transition-all border snap-center ${formData.label === l
                      ? 'bg-[#FFB700] border-[#FFB700] text-[#111827]'
                      : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                      }`}
                  >
                    <span className="font-bold text-[15px]">
                      {displayLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Label Input when 'Other' is selected */}
            {formData.label === 'Other' && (
              <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="border border-[2px] border-[#D9D9D9] focus-within:border-[#D9D9D9] rounded-xl h-14 transition-all relative">
                  <input
                    type="text"
                    value={formData.customLabel}
                    onChange={(e) => setFormData({ ...formData, customLabel: e.target.value })}
                    placeholder={t({ en: 'e.g. Workshop, Shop...', fr: 'ex: Atelier, Boutique...', ar: 'مثلاً: ورشة، متجر...' })}
                    className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-neutral-300"
                    autoFocus
                  />
                  <label className="absolute left-4 top-1.5 text-[11px] font-bold transition-all pointer-events-none text-[#6B7280]">
                    {t({ en: 'Define your label', fr: 'Définissez votre libellé', ar: 'حدد تسميتك' })}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8 bg-white border-t border-[#F3F4F6] z-[10002] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleSave}
          disabled={!formData.buildingName || !isMarked}
          className="w-full h-14 rounded-[15px] bg-[#2C2C2C] text-white font-bold text-[17px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          {t({ en: 'Save address', fr: "Enregistrer l'adresse", ar: "حفظ العنوان" })}
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
