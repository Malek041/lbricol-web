"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, X, CheckCircle2 } from 'lucide-react';
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
}

const AddressDetailsForm: React.FC<AddressDetailsFormProps> = ({ initialData, onSave, onBack }) => {
  const { t } = useLanguage();
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
              {[formData.buildingName].filter(Boolean).join(', ') || t({ en: 'No details yet', fr: 'Aucun détail', ar: 'لا توجد تفاصيل بعد' })}
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
                placeholder="e.g. Jardin des Douars"
                className="w-full h-full px-4 pt-5 pb-1 bg-transparent outline-none text-[15px] font-medium placeholder:text-neutral-300"
              />
              <label className="absolute left-4 top-1.5 text-[11px] font-bold transition-all pointer-events-none text-[#6B7280]">
                {t({ en: 'Name of your property', fr: 'Nom de votre propriété', ar: 'اسم مكانك' })}
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

        </div>

        {/* Mark Entrance */}
        <div className="space-y-3">
          <div className="flex flex-col">
            <h3 className="text-[17px] font-bold text-[#111827]">{t({ en: 'Mark your entrance', fr: 'Marquez votre entrée', ar: 'حدد المدخل' })}</h3>
            <div className={`flex items-center gap-1.5 mt-0.5 ${isMarked ? 'text-[#111827]' : 'text-[#111827]'}`}>
              <CheckCircle2 size={16} fill={isMarked ? "#000000ff" : "none"} className={isMarked ? "text-white" : ""} />
              <p className="text-[13px] font-medium">
                {isMarked
                  ? t({ en: "Done! Thanks for helping the bricoler", fr: "C'est fait ! Merci d'aider le bricoleur", ar: "تم! شكراً لمساعدة العامل" })
                  : t({ en: "Help the courier find the right spot", fr: "Aidez le livreur à trouver l'endroit exact", ar: "ساعد العامل في العثور على المكان الصحيح" })
                }
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
            <h3 className="text-[17px] font-bold text-[#111827]">{t({ en: 'Add a label', fr: 'Ajouter un libellé', ar: 'أضف تسمية' })}</h3>
            <p className="text-[13px] text-[#6B7280]">{t({ en: 'Identify this address more easily next time', fr: 'Identifiez cette adresse plus facilement la prochaine fois', ar: 'حدد هذا العنوان بسهولة أكبر في المرة القادمة' })}</p>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5 snap-x snap-mandatory">
            {labelOptions.map(l => {
              const displayLabel = t({
                en: l,
                fr: l === 'Home' ? 'Maison' : l === 'Flat' ? 'Appartement' : l === 'Garden' ? 'Jardin' : 'Autre',
                ar: l === 'Home' ? 'المنزل' : l === 'Flat' ? 'شقة' : l === 'Garden' ? 'حديقة' : 'مخصص'
              });

              // Hyphenated visual layout as requested
              const hyphenatedDisplay = l === 'Home' ? 'Mai-\nson' : l === 'Flat' ? 'Ap-\npar-\nte' : l === 'Garden' ? 'Jar-\ndin' : displayLabel;

              return (
                <button
                  key={l}
                  onClick={() => setFormData({ ...formData, label: l })}
                  className={`flex-shrink-0 w-[115px] h-14 flex items-center justify-center rounded-[12px] text-[14px] font-bold leading-[1.1] text-center transition-all border snap-center whitespace-pre-line ${formData.label === l
                    ? 'bg-[#FFB700] border-[#FFB700] text-[#111827]'
                    : 'bg-white border-[#E5E7EB] text-[#6B7280]'
                    }`}
                >
                  {hyphenatedDisplay}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#F3F4F6] z-20">
        <button
          onClick={handleSave}
          disabled={!formData.buildingName || !isMarked}
          className="w-full h-14 rounded-full bg-[#037B3E] text-white font-bold text-[17px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
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
