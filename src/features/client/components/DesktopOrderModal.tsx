"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, MapPin, 
  Calendar, Clock, Info, CheckCircle2,
  ArrowRight, Sparkles, Navigation, Search,
  Camera, FileText, Plus, Loader2
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { 
  getServiceById, 
  getServiceVector, 
  SERVICES_HIERARCHY,
  getAllServices,
  type SubService
} from '@/config/services_config';
import { useOrder } from '@/context/OrderContext';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { calculateOrderPrice } from '@/lib/pricing';

const OrderAvailabilityPicker = dynamic(() => import('@/features/orders/components/OrderAvailabilityPicker'), { ssr: false });
const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });

interface DesktopOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string | null;
  subServiceId: string | null;
  availableSubServices?: string[] | null;
}

type OrderStep = 'subservice' | 'location' | 'setup' | 'summary';

export const DesktopOrderModal: React.FC<DesktopOrderModalProps> = ({
  isOpen,
  onClose,
  serviceId,
  subServiceId,
  availableSubServices
}) => {
  const { t, language } = useLanguage();
  const { order, setOrderField, resetOrder } = useOrder();
  const [step, setStep] = useState<OrderStep>('location');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Form States for Setup Step
  const [note, setNote] = useState('');
  const [rooms, setRooms] = useState(2);
  const [propertyType, setPropertyType] = useState('Apartment');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('09:00');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<{ date: Date, time: string }[]>([]);

  // Office Cleaning State
  const [officeDesks, setOfficeDesks] = useState(10);
  const [officeMeetingRooms, setOfficeMeetingRooms] = useState(1);
  const [officeBathrooms, setOfficeBathrooms] = useState(1);
  const [hasKitchenette, setHasKitchenette] = useState(false);
  const [hasReception, setHasReception] = useState(false);
  const [officeAddOns, setOfficeAddOns] = useState<string[]>([]);

  // TV Mounting State
  const [tvCount, setTvCount] = useState(1);
  const [liftingHelp, setLiftingHelp] = useState<string | null>(null);
  const [mountTypes, setMountTypes] = useState<string[]>([]);
  const [wallMaterial, setWallMaterial] = useState<string | null>(null);
  const [mountingAddOns, setMountingAddOns] = useState<string[]>([]);

  // Furniture Assembly State
  const [assemblyItems, setAssemblyItems] = useState<Record<string, any>>({});

  // Location States
  const [currentAddress, setCurrentAddress] = useState(order.location?.address || '');
  const [currentLat, setCurrentLat] = useState(order.location?.lat || 33.5731);
  const [currentLng, setCurrentLng] = useState(order.location?.lng || -7.5898);

  // Errands Specific States
  const [errandCategory, setErrandCategory] = useState('package');
  const [itemDescription, setItemDescription] = useState('');

  const config = serviceId ? getServiceById(serviceId) : null;
  const serviceIcon = serviceId ? getServiceVector(serviceId) : '';

  useEffect(() => {
    if (isOpen && serviceId) {
      if (config) {
        setOrderField('serviceType', serviceId);
        setOrderField('serviceName', config.name);
        setOrderField('serviceIcon', serviceIcon);
        
        if (subServiceId) {
          const sub = config.subServices.find(s => s.id === subServiceId);
          if (sub) {
            setOrderField('subServiceId', sub.id);
            setOrderField('subServiceName', sub.name);
          }
        }
      }
      setStep('location');
    }
  }, [isOpen, serviceId, subServiceId]);

  const filteredSubServices = availableSubServices && config
    ? config.subServices.filter(sub => availableSubServices.includes(sub.id))
    : config?.subServices || [];

  const handleSelectSubService = (sub: SubService) => {
    setOrderField('subServiceId', sub.id);
    setOrderField('subServiceName', sub.name);
    setStep('location');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
        const { uploadToCloudinary } = await import('@/lib/upload');
        const { compressImageFileToDataUrl } = await import('@/lib/imageCompression');
        const uploadPromises = Array.from(files).map(async (file) => {
            const compressedDataUrl = await compressImageFileToDataUrl(file, { maxWidth: 1024, quality: 0.65 });
            return uploadToCloudinary(compressedDataUrl, 'lbricol/tmp', 'lbricol_portfolio');
        });
        const urls = await Promise.all(uploadPromises);
        setPhotos(prev => [...prev, ...urls]);
    } catch (err) {
        console.error("Upload failed", err);
    } finally {
        setIsUploading(false);
    }
  };

  const handleConfirmLocation = () => {
    setOrderField('location', {
      lat: currentLat,
      lng: currentLng,
      address: currentAddress
    });
    setStep('setup');
  };

  const handleConfirmSetup = () => {
    setOrderField('serviceDetails', {
      ...order.serviceDetails,
      note,
      rooms,
      propertyType,
      photoUrls: photos,
      officeDesks,
      officeMeetingRooms,
      officeBathrooms,
      hasKitchenette,
      hasReception,
      officeAddOns,
      tvCount,
      liftingHelp,
      mountTypes,
      wallMaterial,
      mountingAddOns,
      assemblyItems
    });
    
    if (selectedSlots.length > 0) {
        setOrderField('scheduledDate', format(selectedSlots[0].date, 'yyyy-MM-dd'));
        setOrderField('scheduledTime', selectedSlots[0].time);
        setOrderField('multiSlots', selectedSlots.map(s => ({ date: format(s.date, 'yyyy-MM-dd'), time: s.time })));
    }
    
    setStep('summary');
  };

  const renderStep = () => {
    switch (step) {
      case 'subservice':
        return (
          <div className="flex-1 p-10 overflow-y-auto no-scrollbar">
            <div className="mb-10">
              <h2 className="text-4xl font-black text-black mb-3 tracking-tight">
                {t({ en: `Choose your ${config.name} service`, fr: `Choisissez votre service de ${config.name}` })}
              </h2>
              <p className="text-neutral-500 text-lg font-medium">
                {t({ en: 'Select a specific task to continue', fr: 'Sélectionnez une tâche spécifique pour continuer' })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredSubServices.map((sub: any) => (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubService(sub)}
                  className="w-full flex flex-col items-start p-6 rounded-[32px] border-2 border-neutral-100 hover:border-[#FFCC02] hover:bg-[#FFF9E5] transition-all group text-left"
                >
                  <div className="w-16 h-16 rounded-[20px] flex items-center justify-center bg-[#FFF9E5] group-hover:bg-white transition-colors mb-4">
                     <img src={serviceIcon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <div className="font-bold text-xl text-black leading-tight">
                      {t({ en: sub.name, fr: sub.desc?.fr || sub.name })}
                    </div>
                    <div className="text-sm font-semibold text-neutral-400 mt-2 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#01A083]" />
                       {t({ en: sub.pricingArchetype === 'hourly' ? 'Hourly' : 'Fixed Price', fr: sub.pricingArchetype === 'hourly' ? 'Taux horaire' : 'Prix fixe' })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-10 pb-4 border-b border-neutral-100">
               <button onClick={() => setStep('subservice')} className="flex items-center gap-2 text-neutral-400 font-bold mb-4 hover:text-black transition-colors">
                  <ChevronLeft size={20} /> {t({ en: 'Back', fr: 'Retour' })}
               </button>
               <h2 className="text-3xl font-black text-black tracking-tight">
                {t({ en: 'Where do you need help?', fr: 'Où avez-vous besoin d\'aide ?' })}
              </h2>
            </div>
            
            <div className="flex-1 relative min-h-[400px]">
              <MapView
                initialLocation={{ lat: currentLat, lng: currentLng }}
                zoom={16}
                onLocationChange={(point) => {
                  setCurrentLat(point.lat);
                  setCurrentLng(point.lng);
                  setCurrentAddress(point.address);
                }}
              />
              <div className="absolute top-6 left-6 right-6 z-10 bg-white p-4 rounded-3xl shadow-2xl border border-neutral-100 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-[#FFF9E5] flex items-center justify-center text-[#FFCC02]">
                    <MapPin size={24} />
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Service Address', fr: 'Adresse du service' })}</div>
                    <div className="text-lg font-bold text-black truncate">{currentAddress || t({ en: 'Locating...', fr: 'Localisation...' })}</div>
                 </div>
                 <button 
                  onClick={handleConfirmLocation}
                  className="bg-[#FFCC02] text-white px-8 py-4 rounded-2xl font-black text-lg hover:shadow-xl transition-all"
                 >
                    {t({ en: 'Confirm', fr: 'Confirmer' })}
                 </button>
              </div>
            </div>
          </div>
        );

      case 'setup':
        return (
          <div className="flex-1 flex flex-col h-full bg-white">
            <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => setStep('location')} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-black transition-all">
                    <ChevronLeft size={20} />
                 </button>
                 <div>
                    <h2 className="text-2xl font-black text-black tracking-tight">{t({ en: 'Order Setup', fr: 'Configuration' })}</h2>
                    <p className="text-sm font-bold text-neutral-400">{order.subServiceName}</p>
                 </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
              <div className="max-w-[750px] mx-auto space-y-12 pb-10">
                
                {/* Specifics Section */}
                <div className="space-y-8">
                   <h3 className="text-2xl font-black text-black flex items-center gap-3">
                      <Sparkles className="text-[#FFCC02]" /> {t({ en: 'Tell us more', fr: 'Dites-nous en plus' })}
                   </h3>

                   {/* Cleaning Specifics */}
                   {serviceId === 'cleaning' && (
                     <div className="space-y-6">
                        <div className="p-8 rounded-[40px] bg-neutral-50/50 border border-neutral-100 space-y-6">
                            <label className="text-xs font-black text-black uppercase tracking-widest block">{t({ en: 'Number of Rooms', fr: 'Nombre de pièces' })}</label>
                            <div className="flex gap-3 flex-wrap">
                               {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                 <button 
                                  key={n}
                                  onClick={() => setRooms(n)}
                                  className={`w-14 h-14 rounded-2xl font-black transition-all ${rooms === n ? 'bg-[#FFCC02] text-white shadow-xl scale-110' : 'bg-white text-black border border-neutral-100 hover:bg-neutral-50'}`}
                                 >
                                    {n}
                                 </button>
                               ))}
                            </div>
                        </div>

                        {order.subServiceId === 'office_cleaning' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-6 rounded-[32px] border border-neutral-100 space-y-3">
                                 <label className="text-[10px] font-black uppercase text-neutral-400">{t({ en: 'Desks', fr: 'Bureaux' })}</label>
                                 <input type="number" value={officeDesks} onChange={e => setOfficeDesks(parseInt(e.target.value))} className="w-full text-2xl font-black bg-transparent outline-none" />
                              </div>
                              <div className="p-6 rounded-[32px] border border-neutral-100 space-y-3">
                                 <label className="text-[10px] font-black uppercase text-neutral-400">{t({ en: 'Meeting Rooms', fr: 'Salles de réunion' })}</label>
                                 <input type="number" value={officeMeetingRooms} onChange={e => setOfficeMeetingRooms(parseInt(e.target.value))} className="w-full text-2xl font-black bg-transparent outline-none" />
                              </div>
                           </div>
                        )}
                     </div>
                   )}

                   {/* TV Mounting Specifics */}
                   {order.subServiceId === 'tv_mounting' && (
                     <div className="p-8 rounded-[40px] border border-neutral-100 space-y-6">
                        <label className="text-xs font-black text-black uppercase tracking-widest block">{t({ en: 'Wall Material', fr: 'Type de mur' })}</label>
                        <div className="flex gap-3 flex-wrap">
                           {['Drywall', 'Concrete', 'Brick', 'Wood'].map(mat => (
                             <button 
                              key={mat}
                              onClick={() => setWallMaterial(mat)}
                              className={`px-6 py-3 rounded-2xl font-bold transition-all ${wallMaterial === mat ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-500'}`}
                             >
                                {mat}
                             </button>
                           ))}
                        </div>
                     </div>
                   )}

                   {/* Photos Section */}
                   <div className="p-8 rounded-[40px] border-2 border-dashed border-neutral-200 hover:border-[#FFCC02] transition-colors">
                      <div className="flex items-center justify-between mb-6">
                         <div>
                            <h4 className="text-lg font-black text-black">{t({ en: 'Add Photos', fr: 'Ajouter des photos' })}</h4>
                            <p className="text-sm font-bold text-neutral-400">{t({ en: 'Optional, but helps with exact pricing', fr: 'Optionnel, mais aide pour le prix exact' })}</p>
                         </div>
                         <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full bg-[#FFCC02] text-white flex items-center justify-center hover:shadow-lg transition-all">
                            <Plus size={24} />
                         </button>
                         <input type="file" multiple hidden ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" />
                      </div>
                      
                      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                         {photos.map((p, i) => (
                           <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden relative flex-shrink-0 group">
                              <img src={p} className="w-full h-full object-cover" />
                              <button onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <X size={14} />
                              </button>
                           </div>
                         ))}
                         {isUploading && (
                           <div className="w-24 h-24 rounded-2xl bg-neutral-50 flex items-center justify-center animate-pulse">
                              <Loader2 className="animate-spin text-neutral-400" />
                           </div>
                         )}
                      </div>
                   </div>

                   {/* Availability Section */}
                   <div className="space-y-6 pt-6">
                      <h3 className="text-2xl font-black text-black flex items-center gap-3">
                         <Calendar className="text-[#FFCC02]" /> {t({ en: 'When should we come?', fr: 'Quand devrions-nous venir ?' })}
                      </h3>
                      <OrderAvailabilityPicker 
                        bricolerId={""}
                        selectedSlots={selectedSlots}
                        onSelect={setSelectedSlots}
                      />
                   </div>

                   {/* Instructions */}
                   <div className="p-8 rounded-[40px] bg-[#F8F9FA] space-y-4">
                      <label className="text-xs font-black text-black uppercase tracking-widest flex items-center gap-2">
                         <FileText size={16} /> {t({ en: 'Additional Instructions', fr: 'Instructions additionnelles' })}
                      </label>
                      <textarea 
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder={t({ en: "Ex: Don't ring the bell, the baby is sleeping...", fr: "Ex: Ne sonnez pas, le bébé dort..." })}
                        className="w-full h-32 bg-transparent outline-none font-medium text-black resize-none text-lg"
                      />
                   </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={selectedSlots.length === 0}
                  onClick={handleConfirmSetup}
                  className={`w-full py-7 rounded-[32px] font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-2xl ${selectedSlots.length > 0 ? 'bg-black text-white hover:bg-neutral-800' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'}`}
                >
                  {t({ en: 'Review Summary', fr: 'Vérifier le résumé' })}
                  <ArrowRight size={28} />
                </motion.button>
              </div>
            </div>
          </div>
        );

      case 'summary':
        {
          const pricing = calculateOrderPrice(
            order.subServiceId || '',
            40, // Average rate for estimation
            {
               rooms,
               propertyType,
               officeDesks,
               officeMeetingRooms,
               officeBathrooms,
               hasKitchenette,
               hasReception,
               officeAddOns,
               tvCount,
               liftingHelp,
               mountTypes,
               wallMaterial,
               mountingAddOns
            }
          );

          return (
            <div className="flex-1 flex flex-col h-full bg-white">
              <div className="p-8 border-b border-neutral-100">
                <button onClick={() => setStep('setup')} className="flex items-center gap-2 text-neutral-400 font-bold hover:text-black transition-colors">
                  <ChevronLeft size={20} /> {t({ en: 'Back', fr: 'Retour' })}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 no-scrollbar">
                <div className="max-w-[650px] mx-auto space-y-10">
                  <div className="text-center space-y-4">
                    <h2 className="text-5xl font-black text-black tracking-tight">{t({ en: 'Ready to Book?', fr: 'Prêt à réserver ?' })}</h2>
                    <p className="text-neutral-400 font-bold text-xl">{t({ en: 'Review your order details below', fr: 'Vérifiez les détails de votre commande' })}</p>
                  </div>

                  <div className="bg-[#F8F9FA] rounded-[48px] p-10 space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-[32px] bg-white shadow-xl flex items-center justify-center p-5">
                        <img src={serviceIcon} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-black leading-tight">{order.subServiceName}</h3>
                        <p className="text-neutral-400 font-black uppercase text-xs tracking-widest mt-1">{order.serviceName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center gap-5 p-6 bg-white rounded-3xl border border-neutral-100">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFF9E5] text-[#FFCC02] flex items-center justify-center">
                          <MapPin size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Location', fr: 'Lieu' })}</p>
                          <p className="text-black font-extrabold truncate text-lg">{order.location?.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 p-6 bg-white rounded-3xl border border-neutral-100">
                        <div className="w-12 h-12 rounded-2xl bg-[#E7F9F0] text-[#01A083] flex items-center justify-center">
                          <Clock size={24} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Scheduled For', fr: 'Programmé pour' })}</p>
                          <p className="text-black font-extrabold text-lg">
                            {selectedSlots.map(s => `${format(s.date, 'MMM dd')} @ ${s.time}`).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-2">
                          <span className="font-bold text-neutral-400">{t({ en: 'Base Estimate', fr: 'Estimation de base' })}</span>
                          <span className="font-black text-black">{pricing.subtotal} MAD</span>
                       </div>
                       <div className="flex items-center justify-between px-2">
                          <span className="font-bold text-neutral-400 text-sm">{t({ en: 'Service Fees', fr: 'Frais de service' })}</span>
                          <span className="font-black text-black text-sm text-neutral-400">+{pricing.serviceFee} MAD</span>
                       </div>
                    </div>

                    <div className="h-px bg-neutral-200 my-4" />

                    <div className="flex items-center justify-between px-2">
                      <div className="text-neutral-400 font-bold">{t({ en: 'Estimated Total', fr: 'Total Estimé' })}</div>
                      <div className="text-5xl font-black text-black">
                        ~ {pricing.total} <span className="text-base opacity-40">MAD</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      alert('Order Broadcasted city-wide!');
                      onClose();
                    }}
                    className="w-full py-8 bg-black text-white rounded-[40px] font-black text-3xl hover:bg-[#FFCC02] hover:text-black transition-all shadow-2xl relative group overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-4">
                      {t({ en: 'Post Your Order', fr: 'Publier ma demande' })}
                      <ArrowRight size={32} />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        }
    }
  };

  // Helper for Sidebar Pricing
  const sidebarPricing = calculateOrderPrice(
    order.subServiceId || serviceId || '',
    40,
    {
      rooms,
      propertyType,
      officeDesks,
      officeMeetingRooms,
      officeBathrooms,
      hasKitchenette,
      hasReception,
      officeAddOns,
      tvCount,
      liftingHelp: (liftingHelp as any) || undefined,
      mountTypes,
      wallMaterial: (wallMaterial as any) || undefined,
      mountingAddOns
    }
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative bg-white w-full max-w-[1250px] h-[90vh] rounded-[48px] overflow-hidden shadow-2xl flex"
          >
            {/* Modal Content - Left Side */}
            <div className="flex-1 flex flex-col h-full bg-white border-r border-neutral-100">
               {renderStep()}
            </div>

            {/* Modal Sidebar - Right Side */}
            <div className="w-[450px] bg-[#F8F9FA] p-12 flex flex-col overflow-y-auto no-scrollbar">
               <div className="flex justify-end mb-8">
                  <button onClick={onClose} className="w-12 h-12 rounded-full bg-white border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-black hover:shadow-md transition-all">
                    <X size={24} />
                  </button>
               </div>

               <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-40 h-40 mb-8 relative">
                     <div className="absolute inset-0 bg-[#FFCC02]/10 rounded-full blur-3xl animate-pulse" />
                     <img 
                       src={serviceIcon} 
                       alt={config.name}
                       className="w-full h-full object-contain relative z-10"
                     />
                  </div>
                  
                  <h3 className="text-3xl font-black text-black mb-2 tracking-tighter uppercase">
                    {order.subServiceName || config?.name}
                  </h3>
                  <div className="text-neutral-400 font-bold mb-8">{order.serviceName}</div>
                  
                  <div className="w-full bg-white rounded-[40px] p-8 shadow-sm border border-neutral-100 mb-8">
                     <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4">
                        {t({ en: 'Estimated Price', fr: 'Prix Estimé' })}
                     </div>
                     <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-black text-black">~{sidebarPricing.total}</span>
                        <span className="text-xl font-bold text-neutral-400">MAD</span>
                     </div>
                     <div className="mt-4 text-sm font-bold text-[#01A083] bg-[#E7F9F0] py-2 px-4 rounded-full inline-block">
                        {t({ en: 'No upfront payment', fr: 'Aucun paiement immédiat' })}
                     </div>
                  </div>

                  <div className="w-full space-y-4">
                     <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-neutral-100">
                        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
                           <Info size={24} />
                        </div>
                        <p className="text-left text-sm font-bold text-neutral-500 leading-snug">
                           {t({ 
                             en: 'This estimate is based on typical task complexity and average rates.',
                             fr: 'Cette estimation est basée sur la complexité typique et les taux moyens.'
                           })}
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
