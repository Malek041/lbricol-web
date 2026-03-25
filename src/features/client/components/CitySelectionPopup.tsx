"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Search, Check, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS } from '@/config/moroccan_areas';
import { cn } from '@/lib/utils';
import { useIsMobileViewport } from '@/lib/mobileOnly';

interface CitySelectionPopupProps {
    isOpen: boolean;
    onSelectCity: (city: string, area: string) => void;
    onClose?: () => void;
}

const CitySelectionPopup = ({ isOpen, onSelectCity, onClose }: CitySelectionPopupProps) => {
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);
    const [step, setStep] = useState<'city' | 'area'>('city');
    const [selectedCity, setSelectedCity] = useState('');
    const [areaSearch, setAreaSearch] = useState('');
    const [selectedArea, setSelectedArea] = useState('');

    useEffect(() => {
        if (!isOpen) { setStep('city'); setSelectedCity(''); setAreaSearch(''); setSelectedArea(''); }
    }, [isOpen]);

    const filteredAreas = useMemo(() => {
        const all = selectedCity ? MOROCCAN_CITIES_AREAS[selectedCity] || [] : [];
        if (!areaSearch.trim()) return all;
        return all.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
    }, [selectedCity, areaSearch]);

    const handleCityClick = (city: string) => {
        setSelectedCity(city);
        setAreaSearch('');
        setSelectedArea('');
        setStep('area');
    };

    const handleConfirmArea = () => {
        if (!selectedArea) return;
        onSelectCity(selectedCity, selectedArea);
    };

    const getCityLabel = (city: string) =>
        t({
            en: city,
            fr: city,
            ar:
                city === 'Casablanca' ? 'الدار البيضاء' :
                    city === 'Marrakech' ? 'مراكش' :
                        city === 'Essaouira' ? 'الصويرة' :
                            city === 'Agadir' ? 'أكادير' :
                                city === 'Tangier' ? 'طنجة' :
                                    city === 'Rabat' ? 'الرباط' :
                                        city === 'Fes' ? 'فاس' :
                                            city
        });

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-0 md:p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 20 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="bg-white w-full md:max-w-[480px] rounded-t-[32px] md:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle */}
                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-4 mb-1 flex-shrink-0" />

                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0 border-b border-neutral-100">
                            {step === 'area' ? (
                                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors" onClick={() => setStep('city')}>
                                    <ChevronLeft size={18} />
                                </button>
                            ) : (
                                <div className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100">
                                    <MapPin size={18} className="text-neutral-700" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h2 className="text-[17px] font-black text-neutral-900 tracking-tight">
                                    {step === 'city'
                                        ? t({ en: 'Select your city', fr: 'Choisissez votre ville', ar: 'اختر مدينتك' })
                                        : t({ en: `Choose area in ${selectedCity}`, fr: `Choisissez un quartier à ${selectedCity}`, ar: `اختر الحي في ${getCityLabel(selectedCity)}` })
                                    }
                                </h2>
                                {step === 'area' && selectedArea && (
                                    <p className="text-[12px] text-[#219178] font-bold">
                                        {t({ en: `${selectedArea} selected`, fr: `${selectedArea} sélectionné`, ar: `تم اختيار ${selectedArea}` })}
                                    </p>
                                )}
                            </div>
                            {onClose && (
                                <button className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors" onClick={onClose}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {step === 'city' && (
                                    <motion.div key="city" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="p-5 space-y-3">
                                        <p className="text-[13px] text-neutral-500 font-medium">
                                            {t({ en: 'Find local experts near you', fr: 'Trouvez des experts locaux près de vous', ar: 'اعثر على خبراء محليين بالقرب منك' })}
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {MOROCCAN_CITIES.map(city => (
                                                <motion.button
                                                    key={city}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleCityClick(city)}
                                                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl border-2 border-neutral-100 bg-neutral-50 hover:border-[#219178] hover:bg-[#219178]/5 transition-all text-left"
                                                >
                                                    <MapPin size={16} className="text-neutral-400 flex-shrink-0" />
                                                    <span className="text-[15px] font-bold text-neutral-900">{getCityLabel(city)}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 'area' && (
                                    <motion.div key="area" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="p-5 space-y-4">
                                        <p className="text-[13px] text-neutral-500 font-medium">
                                            {t({ en: 'Select your neighbourhood for better matching', fr: 'Sélectionnez votre quartier pour un meilleur matching', ar: 'اختر حيّك للحصول على مطابقة أفضل' })}
                                        </p>
                                        {/* Search */}
                                        <div className="flex items-center gap-3 bg-neutral-50 border-2 border-neutral-200 rounded-2xl px-4 py-3 focus-within:border-[#219178] transition-colors">
                                            <Search size={16} className="text-neutral-400 flex-shrink-0" />
                                            <input
                                                type="text"
                                                placeholder={t({ en: 'Search neighbourhood...', fr: 'Rechercher un quartier...', ar: 'ابحث عن حي...' })}
                                                value={areaSearch}
                                                onChange={e => setAreaSearch(e.target.value)}
                                                className="flex-1 bg-transparent outline-none text-[14px] font-medium placeholder:text-neutral-400"
                                            />
                                            {areaSearch && <button onClick={() => setAreaSearch('')}><X size={14} className="text-neutral-400" /></button>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto no-scrollbar">
                                            {/* Custom area option if search doesn't match exactly */}
                                            {areaSearch.trim() && !filteredAreas.some(a => a.toLowerCase() === areaSearch.trim().toLowerCase()) && (
                                                <button
                                                    onClick={() => setSelectedArea(areaSearch.trim())}
                                                    className={cn(
                                                        'col-span-2 flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-[#219178] text-[13px] font-bold text-[#219178] bg-[#219178]/5 transition-all mb-1',
                                                        selectedArea === areaSearch.trim() ? 'bg-[#219178] text-white border-[#219178]' : ''
                                                    )}
                                                >
                                                    {selectedArea === areaSearch.trim() ? <Check size={12} strokeWidth={3} /> : <Search size={12} />}
                                                    {t({ en: `Add "${areaSearch}"`, fr: `Ajouter "${areaSearch}"`, ar: `إضافة "${areaSearch}"` })}
                                                </button>
                                            )}

                                            {filteredAreas.map(area => {
                                                const sel = selectedArea === area;
                                                return (
                                                    <button
                                                        key={area}
                                                        onClick={() => setSelectedArea(area)}
                                                        className={cn(
                                                            'flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-[13px] font-semibold text-left transition-all',
                                                            sel ? 'bg-[#219178] text-white border-[#219178]' : 'bg-neutral-50 text-neutral-800 border-neutral-100 hover:border-neutral-300'
                                                        )}
                                                    >
                                                        {sel && <Check size={12} strokeWidth={3} className="flex-shrink-0" />}
                                                        {area}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {filteredAreas.length === 0 && !areaSearch.trim() && (
                                            <p className="text-center text-neutral-400 text-sm py-4">{t({ en: 'No areas found for this city.', fr: 'Aucun quartier trouvé pour cette ville.', ar: 'لم يتم العثور على أحياء لهذه المدينة.' })}</p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer: confirm area */}
                        {step === 'area' && (
                            <div className="p-5 flex-shrink-0 border-t border-neutral-100">
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleConfirmArea}
                                    disabled={!selectedArea}
                                    className="w-full h-13 bg-[#219178] disabled:bg-neutral-200 text-white disabled:text-neutral-400 rounded-2xl text-[16px] font-black py-4 transition-all"
                                >
                                    {t({ en: `Confirm Area`, fr: `Confirmer le quartier`, ar: 'تأكيد الحي' })}
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CitySelectionPopup;
