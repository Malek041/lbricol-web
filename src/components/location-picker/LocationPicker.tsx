"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { X, Loader2, Navigation, Search, ChevronLeft, MapPin, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LocationPickerProps, LocationPoint, SavedAddress } from './types';
import { useLanguage } from '@/context/LanguageContext';

// Components
import AddressCard from './AddressCard';
import SavedAddressList from './SavedAddressList';
import AddressDetailsForm from './AddressDetailsForm';
import AddressSearch from './AddressSearch';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

type PickerView = 'MAP' | 'DETAILS' | 'SEARCH';
const EMPTY_ARRAY: SavedAddress[] = [];

const LocationPicker: React.FC<LocationPickerProps> = ({
  mode,
  serviceType,
  serviceIcon = '🚲',
  title,
  savedAddresses: initialSavedAddresses = EMPTY_ARRAY,
  onConfirm,
  onClose,
  autoLocate,
  onSaveAddress,
  onDeleteAddress,
  isInline = false,
  onConfirmRadius,
  initialRadius = 10,
  pinImage,
  isHostWizard,
  onPermissionStatusChange,
}) => {
  // Views & State
  const router = useRouter();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<PickerView>('MAP');
  const [currentPoint, setCurrentPoint] = useState<LocationPoint | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState<Partial<SavedAddress> & { lat: number, lng: number, address: string } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(initialSavedAddresses);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);

  const handlePermissionStatusChange = (denied: boolean) => {
    setGpsPermissionDenied(denied);
    onPermissionStatusChange?.(denied);

    // If permission was just granted, auto-locate
    if (!denied && gpsPermissionDenied) {
      handleLocate();
    }
  };


  // Interaction State
  const [pickupPoint, setPickupPoint] = useState<LocationPoint | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [triggerGps, setTriggerGps] = useState(0);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [flyToPoint, setFlyToPoint] = useState<LocationPoint | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [radiusView, setRadiusView] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(initialRadius);
  const [sheetLoading, setSheetLoading] = useState(true);

  const isBricolerBase = serviceType === 'bricoler-base';

  // Simulated loading removed as per user experience needs
  useEffect(() => {
    setSheetLoading(false);
  }, []);

  // Sync local addresses with props
  useEffect(() => {
    setSavedAddresses(initialSavedAddresses);
  }, [initialSavedAddresses]);

  // Auto-locate on mount if requested
  useEffect(() => {
    if (autoLocate && !hasAutoLocated) {
      handleLocate();
      setHasAutoLocated(true);
    }
  }, [autoLocate, hasAutoLocated]);

  // View A (Map) Actions
  const handleLocationChange = (point: LocationPoint) => {
    setCurrentPoint(point);
    setIsLocating(false);
  };

  const handleLocate = () => {
    setIsManualSelection(false);
    setIsLocating(true);
    setTriggerGps(Date.now());
  };

  const handleConfirmPoint = () => {
    if (!currentPoint) return;
    setIsManualSelection(true);

    if (isBricolerBase && !isHostWizard) {
      onConfirm({ pickup: currentPoint });
      return;
    }

    if (mode === 'double') {
      if (step === 1) {
        setPickupPoint(currentPoint);
        setStep(2);
        // The bubble will stay since currentPoint is still the same
        return;
      } else {
        onConfirm({ pickup: pickupPoint!, dropoff: currentPoint });
        return;
      }
    }

    // When using map point, go to Details View first to save/confirm
    setSelectedForDetails({
      address: currentPoint.address,
      lat: currentPoint.lat,
      lng: currentPoint.lng,
      label: 'Home'
    });
    setActiveView('DETAILS');
  };

  const handleSavedSelect = (addr: SavedAddress) => {
    const point = { lat: addr.lat, lng: addr.lng, address: addr.address };
    setIsManualSelection(true);
    setFlyToPoint(point);

    if (mode === 'single') {
      onConfirm({ pickup: point, savedAddress: addr });
    } else {
      if (step === 1) {
        setPickupPoint(point);
        setStep(2);
      } else {
        onConfirm({ pickup: pickupPoint!, dropoff: point });
      }
    }
  };

  const handleEditAddress = (addr: SavedAddress) => {
    setSelectedForDetails(addr);
    setActiveView('DETAILS');
  };

  // View B (Details) Actions
  const handleSaveDetails = (data: SavedAddress) => {
    // 1. Update/Add to local saved list
    const exists = savedAddresses.find(a => a.id === data.id);
    let updatedList: SavedAddress[];
    if (exists) {
      updatedList = savedAddresses.map(a => a.id === data.id ? data : a);
    } else {
      updatedList = [data, ...savedAddresses];
    }
    setSavedAddresses(updatedList);
    onSaveAddress?.(data);

    // 2. Auto-confirm/select this address to finalize the flow
    onConfirm({
      pickup: { ...data },
      savedAddress: data
    });

    // 3. Return to Map View (Removed view switch to avoid flash before unmount)
    // setActiveView('MAP');
    // setSelectedForDetails(null);
  };

  // View C (Search) Actions
  const handleSearchSelect = (lat: number, lng: number, address: string) => {
    setIsManualSelection(true);
    setFlyToPoint({ lat, lng, address });

    if (isBricolerBase) {
      setActiveView('MAP');
      setShowSearchInput(false);
      return;
    }

    setSelectedForDetails({ lat, lng, address, label: 'Home' });
    // Go directly to details as per spec, MapView thumbnail will show the location
    setActiveView('DETAILS');
  };

  if (activeView === 'SEARCH') {
    return <AddressSearch onBack={() => setActiveView('MAP')} onSelect={handleSearchSelect} />;
  }

  if (activeView === 'DETAILS' && selectedForDetails) {
    return <AddressDetailsForm
      initialData={selectedForDetails}
      onBack={() => setActiveView('MAP')}
      onSave={handleSaveDetails}
      isHostWizard={isHostWizard}
    />;
  }

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
      className={cn(
        "bg-white flex flex-col font-jakarta transition-all overflow-hidden",
        isInline ? "relative w-full h-full" : "fixed inset-0 z-[10000]"
      )}
    >
      {/* 1. Map Area (Fixed Height) */}
      <div
        className={cn(
          "relative bg-neutral-100 overflow-hidden transition-all duration-500 ease-in-out z-0 shrink-0",
          isInteracting || showSearchInput ? 'h-[65%]' : (radiusView ? 'h-[45%]' : (isBricolerBase && !showSearchInput ? 'h-[72%]' : 'h-[42%]'))
        )}
      >
        {/* Full-screen under-layer map -> Now dynamically matches flex height */}
        <div className="absolute top-0 left-0 w-full h-full">
          <MapView
            onLocationChange={handleLocationChange}
            onLocationError={() => setIsLocating(false)}
            onLoadingChange={setIsGeocoding}
            triggerGps={isManualSelection ? 0 : triggerGps}
            flyToPoint={flyToPoint || undefined}
            onInteractionStart={() => setIsInteracting(true)}
            onInteractionEnd={() => setIsInteracting(false)}
            pinY={50}
            zoom={17}
            onPermissionStatusChange={handlePermissionStatusChange}
          />

        </div>

        {/* 3. TRULY FIXED PIN & CALLOUT — Always in visual center of Map */}
        <div className="absolute left-1/2 top-1/2 pointer-events-none z-[1001]" style={{ transform: 'translate(-50%, -100%)' }}>
          <motion.div>
            <div className="relative flex flex-col items-center">
              {/* The Address Bubble */}
              {currentPoint && (
                <div className="absolute bottom-[65px] min-w-max">
                  <AddressCard
                    address={currentPoint.address}
                    icon={serviceIcon}
                    onConfirm={handleConfirmPoint}
                    loading={isGeocoding}
                  />
                </div>
              )}

              {/* The Pin Image */}
              <div className="w-[45px]">
                <img
                  src={pinImage || "/Images/map Assets/LocationPin.png"}
                  alt="Pin"
                  className="w-full h-auto drop-shadow-lg"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Controls (Inside resizable area but sticky) */}
        <div className="absolute inset-0 pointer-events-none z-[1002]">
          {/* X Close Button */}
          <div className="absolute top-4 left-4 pointer-events-auto">
            <button
              onClick={() => {
                if (radiusView) {
                  setRadiusView(false);
                } else {
                  onClose?.();
                  // Always take client users back home if they dismiss the picker
                  if (!isBricolerBase) {
                    router.push('/');
                  }
                }
              }}
              className="w-9 h-9 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-95 transition-transform"
            >
              {radiusView ? (
                <ChevronLeft size={20} className="text-[#374151]" />
              ) : (
                <X size={18} className="text-[#374151]" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bottom Sheet Area */}
      <div className="flex-1 flex flex-col relative z-10 -mt-30 min-h-0">
        {/* New Locator Button above sheet */}
        {!sheetLoading && (
          <button
            onClick={handleLocate}
            className="absolute -top-16 right-6 w-14 h-14 bg-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex items-center justify-center text-black active:scale-90 transition-all z-[100] border border-neutral-50"
          >
            {isLocating ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Navigation size={24} className="fill-[#2C2C2C]" />
            )}
          </button>
        )}

        <div className="flex-1 bg-white  shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-5 py-8  flex flex-col overflow-y-auto no-scrollbar">

          {sheetLoading ? (
            <div className="flex flex-col gap-6 animate-pulse">
              <div className="items-center gap-4 hidden"> {/* Hidden original placeholder logic */} </div>
            </div>
          ) : showSearchInput ? (
            <motion.div
              key="search-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <div className="relative">
                <button
                  onClick={() => setShowSearchInput(false)}
                  className="absolute -top-1 -left-2 p-2 text-neutral-400 hover:text-neutral-600 active:scale-90 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <p className="text-center text-[15px] font-medium text-neutral-600">
                  {t({ en: 'Trouble locating your address?', fr: 'Problème pour localiser votre adresse ?', ar: 'هل تواجه مشكلة في تحديد موقعك؟' })}<br />
                  {t({ en: 'Try using search instead', fr: 'Essayez d’utiliser la recherche', ar: 'جرب البحث بدلاً من ذلك' })}
                </p>
              </div>

              <div
                onClick={() => setActiveView('SEARCH')}
                className="flex items-center gap-3 px-6 py-4 bg-[#F9FAFB] border border-neutral-100 rounded-full cursor-pointer hover:bg-neutral-100 transition-all group"
              >
                <Search size={22} className="text-neutral-400 group-hover:text-neutral-600 transition-colors" />
                <span className="text-neutral-400 font-medium text-[16px] group-hover:text-neutral-600 transition-colors">
                  {t({ en: 'Rechercher rue, ville, quartier...', fr: 'Rechercher rue, ville, quartier...', ar: 'ابحث عن الشارع، المدينة، الحي...' })}
                </span>
              </div>
            </motion.div>
          ) : isBricolerBase ? (
            <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
              <AnimatePresence mode="wait">
                {radiusView ? (
                  <motion.div
                    key="radius-view"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Service Radius', fr: 'Rayon de service', ar: 'نطاق الخدمة' })}</h3>
                      <p className="text-neutral-500 text-[14px] font-medium leading-relaxed">
                        {t({ en: 'How far are you willing to travel for tasks?', fr: 'Jusqu\'où êtes-vous prêt à vous déplacer ?', ar: 'إلى أي مدى أنت مستعد للتنقل للقيام بالمهام؟' })}
                      </p>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {[3, 5, 10, 20, 50].map(radius => (
                        <button
                          key={radius}
                          onClick={() => {
                            setSelectedRadius(radius);
                            if (currentPoint) {
                              onConfirm({ pickup: currentPoint });
                              onConfirmRadius?.(radius);
                            }
                          }}
                          className={cn(
                            "py-3 rounded-[12px] border-2 text-center transition-all flex flex-col items-center justify-center",
                            selectedRadius === radius ? 'bg-[#E6F6F2] text-[#01A083] border-[#01A083]' : 'bg-white text-neutral-900 border-neutral-100 hover:border-neutral-200'
                          )}
                        >
                          <span className="text-lg font-black leading-none">{radius}</span>
                          <span className="text-[10px] font-bold opacity-60 mt-0.5">KM</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-6 pb-6"
                  >
                    <h2 className="text-[24px] font-black text-black leading-tight tracking-tight">
                      {t({ en: 'Where does your Property locate?', fr: 'Où se situe votre bien ?', ar: 'أين يقع عقارك؟' })}
                    </h2>

                    {/* Address Display Row */}
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-400">
                        <MapPin size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold text-neutral-900 line-clamp-2 leading-tight">
                          {currentPoint?.address || t({ en: 'Locating...', fr: 'Localisation...', ar: 'جاري تحديد الموقع...' })}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowSearchInput(true)}
                        className="w-10 h-10 rounded-full border border-neutral-100 flex items-center justify-center text-neutral-400 active:bg-neutral-50"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>

                    <button
                      onClick={handleConfirmPoint}
                      disabled={isGeocoding}
                      className={cn(
                        "w-full h-15 text-white rounded-[15px] font-black text-[18px] active:scale-95 transition-all flex items-center justify-center gap-3",
                        isGeocoding ? 'bg-neutral-300 shadow-none' : 'bg-[#2C2C2C]'
                      )}
                    >
                      {isGeocoding ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          {t({ en: 'Loading...', fr: 'Chargement...', ar: 'جاري التحميل...' })}
                        </>
                      ) : (
                        t({ en: 'Confirm This Location', fr: 'Confirmer ce lieu', ar: 'تأكيد هذا الموقع' })
                      )}
                    </button>
                    <button
                      onClick={() => setShowSearchInput(true)}
                      className="w-full mt-1 text-[#2C2C2C] font-bold text-[17px] transition-all"
                    >
                      {t({ en: 'Set Another address', fr: 'Définir une autre adresse', ar: 'تحديد عنوان آخر' })}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <SavedAddressList
                addresses={savedAddresses}
                onSelect={handleSavedSelect}
                onEdit={handleEditAddress}
                onAdd={() => setShowSearchInput(true)}
                title={mode === 'double' && step === 2
                  ? t({ en: "Where are you moving to?", fr: "Où déménagez-vous ?", ar: "إلى أين ستنتقل؟" })
                  : t({ en: "Where do you need help?", fr: "Où avez-vous besoin d'aide ?", ar: "أيـن تـحـتـاج الـمـسـاعـدة؟" })
                }
              />
            </div>
          )
          }
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
};

export default LocationPicker;
