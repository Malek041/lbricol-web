"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
   X, ChevronRight, ChevronLeft, MapPin,
   Calendar, Clock, Info, CheckCircle2,
   ArrowRight, Sparkles, Navigation, Search,
   Camera, FileText
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
   getServiceById,
   getServiceVector,
   SERVICES_HIERARCHY,
   type SubService
} from '@/config/services_config';
import { useOrder } from '@/context/OrderContext';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });

interface DesktopOrderModalProps {
   isOpen: boolean;
   onClose: () => void;
   serviceId: string | null;
   availableSubServices?: string[] | null;
}

type OrderStep = 'subservice' | 'location' | 'matching' | 'setup' | 'summary';

export const DesktopOrderModal: React.FC<DesktopOrderModalProps> = ({
   isOpen,
   onClose,
   serviceId,
   availableSubServices
}) => {
   const { t } = useLanguage();
   const { order, setOrderField, resetOrder } = useOrder();
   const [step, setStep] = useState<OrderStep>('subservice');

   // Form States for Setup Step
   const [note, setNote] = useState('');
   const [rooms, setRooms] = useState(2);
   const [propertyType, setPropertyType] = useState('Apartment');
   const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
   const [scheduledTime, setScheduledTime] = useState<string>('09:00');

   // Location States
   const [currentAddress, setCurrentAddress] = useState(order.location?.address || '');
   const [currentLat, setCurrentLat] = useState(order.location?.lat || 33.5731);
   const [currentLng, setCurrentLng] = useState(order.location?.lng || -7.5898);

   // Errands Specific States
   const [errandCategory, setErrandCategory] = useState('package');
   const [itemDescription, setItemDescription] = useState('');

   // Matching & UI States
   const [focusedProviderId, setFocusedProviderId] = useState<string | null>(null);
   const [triggerGps, setTriggerGps] = useState(0);

   useEffect(() => {
      if (isOpen) {
         setStep('subservice');
         // Initialize with existing order data if any
         setNote(order.serviceDetails?.note || '');
         setRooms(order.serviceDetails?.rooms || 2);
         setItemDescription(order.description || '');

         if (serviceId === 'errands') {
            const sid = order.subServiceId;
            if (sid === 'grocery_shopping') setErrandCategory('grocery');
            else if (sid === 'pharmacy_pickup') setErrandCategory('pharmacy');
            else setErrandCategory('package');
         }
      }
   }, [isOpen, serviceId, order.subServiceId]);

   if (!serviceId) return null;
   const config = getServiceById(serviceId);
   if (!config) return null;
   const serviceIcon = getServiceVector(serviceId);

   // Filter subservices based on availability if provided
   const filteredSubServices = availableSubServices
      ? config.subServices.filter(sub => availableSubServices.includes(sub.id))
      : config.subServices;

   const handleSelectSubService = (sub: SubService) => {
      setOrderField('serviceType', serviceId);
      setOrderField('serviceName', config.name);
      setOrderField('subServiceId', sub.id);
      setOrderField('subServiceName', sub.name);
      setOrderField('serviceIcon', serviceIcon);
      setStep('location');
   };

   const handleConfirmLocation = () => {
      setOrderField('location', {
         lat: currentLat,
         lng: currentLng,
         address: currentAddress
      });
      setStep('matching');
   };

   const providers = [
      { id: '1', name: 'Bricoler', rating: 5.0, taskCount: 1, rate: 50, avatarUrl: 'https://i.pravatar.cc/150?u=1', isLive: true, lat: currentLat + 0.005, lng: currentLng + 0.005, badge: 'NEW' },
      { id: '2', name: 'Amina', rating: 5.0, taskCount: 0, rate: 45, avatarUrl: 'https://i.pravatar.cc/150?u=2', isLive: true, lat: currentLat - 0.003, lng: currentLng + 0.004, badge: 'NEW' },
      { id: '3', name: 'Karim', rating: 4.8, taskCount: 12, rate: 60, avatarUrl: 'https://i.pravatar.cc/150?u=3', isLive: true, lat: currentLat + 0.002, lng: currentLng - 0.006, badge: 'PRO' },
   ];

   const handleSelectProvider = (p: any) => {
      setOrderField('providerId', p.id);
      setOrderField('providerName', p.name);
      setOrderField('providerAvatar', p.avatarUrl);
      setOrderField('providerRate', p.rate);
      setOrderField('providerRating', p.rating);
      setOrderField('providerJobsCount', p.taskCount);
      setOrderField('providerBadge', p.badge);
      setStep('setup');
   };

   const handleConfirmSetup = () => {
      setOrderField('serviceDetails', {
         ...order.serviceDetails,
         note,
         rooms,
         propertyType,
         errandCategory,
         photoUrls: []
      });
      setOrderField('description', itemDescription);
      if (scheduledDate) {
         setOrderField('scheduledDate', format(scheduledDate, 'yyyy-MM-dd'));
         setOrderField('scheduledTime', scheduledTime);
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

                  <div className="grid grid-cols-1 gap-4">
                     {filteredSubServices.map((sub) => (
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
                        triggerGps={triggerGps}
                        pinY={50}
                        onLocationChange={(point) => {
                           setCurrentLat(point.lat);
                           setCurrentLng(point.lng);
                           setCurrentAddress(point.address);
                        }}
                     />

                     {/* Centered Pin & Floating Address Card */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full mb-10 z-[1000] pointer-events-none flex flex-col items-center">
                        <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="bg-white px-5 py-3 rounded-[24px] shadow-2xl border border-black/5 flex items-center gap-3 min-w-[280px] mb-4"
                        >
                           <div className="w-10 h-10 rounded-full bg-[#E7F9F0] text-[#01A083] flex items-center justify-center shrink-0">
                              <MapPin size={22} />
                           </div>
                           <div className="min-w-0">
                              <div className="text-[14px] font-black text-black leading-tight truncate">{currentAddress || t({ en: 'Locating...', fr: 'Localisation...' })}</div>
                              <div className="text-[11px] font-bold text-[#01A083] uppercase tracking-wider">{t({ en: 'Use this point', fr: 'Utiliser ce point' })}</div>
                           </div>
                        </motion.div>

                        <div className="relative">
                           <img
                              src="/Images/map Assets/LocationPin.png"
                              alt="Pin"
                              className="w-16 h-16 object-contain"
                              onError={(e) => {
                                 (e.target as any).src = 'https://cdn-icons-png.flaticon.com/512/2776/2776067.png';
                              }}
                           />
                           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-black/20 rounded-full blur-md" />
                        </div>
                     </div>

                     {/* GPS Button */}
                     <div className="absolute bottom-[160px] right-6 z-10">
                        <button
                           className="w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-[#01A083] hover:scale-110 active:scale-95 transition-all border border-neutral-100"
                           onClick={() => setTriggerGps(prev => prev + 1)}
                        >
                           <Navigation size={24} className="fill-current" />
                        </button>
                     </div>

                     {/* Bottom Action Footer */}
                     <div className="absolute bottom-0 left-0 right-0 bg-white p-8 border-t border-neutral-100 z-10 flex flex-col items-center gap-3">
                        <button
                           onClick={handleConfirmLocation}
                           className="w-full max-w-[500px] py-5 bg-[#01A083] text-white rounded-[50px] font-black text-xl hover:shadow-xl active:scale-[0.98] transition-all"
                        >
                           {t({ en: 'Confirm This Location', fr: 'Confirmer cet emplacement' })}
                        </button>
                        <button className="text-[#01A083] font-extrabold text-[15px] hover:underline transition-all">
                           {t({ en: 'Set Another address', fr: 'Indiquer une autre adresse' })}
                        </button>
                     </div>
                  </div>
               </div>
            );

         case 'matching':
            return (
               <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                  <div className="absolute top-6 left-6 z-20">
                     <button
                        onClick={() => setStep('location')}
                        className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-black border border-neutral-100 hover:scale-110 active:scale-95 transition-all"
                     >
                        <ChevronLeft size={24} />
                     </button>
                  </div>

                  <div className="flex-1 relative">
                     <MapView
                        initialLocation={{ lat: currentLat, lng: currentLng }}
                        zoom={14}
                        pinY={50}
                        onLocationChange={() => { }}
                        providerPins={providers.map(p => ({
                           ...p,
                           isSelected: focusedProviderId === p.id
                        }))}
                        clientPin={{ lat: currentLat, lng: currentLng }}
                        focusedProviderId={focusedProviderId}
                        onProviderClick={(id) => setFocusedProviderId(id)}
                        lockCenterOnFocus={true}
                     />
                  </div>

                  <motion.div
                     initial={{ y: '100%' }}
                     animate={{ y: 0 }}
                     className="absolute bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-xl border-t border-neutral-100 p-8 rounded-t-[48px] shadow-3xl overflow-hidden"
                  >
                     <div className="flex items-center justify-between mb-8 max-w-[1000px] mx-auto px-4">
                        <h3 className="text-3xl font-black text-black tracking-tight">{t({ en: 'Ideal Bricolers', fr: 'Bricoleurs Idéaux' })}</h3>
                        <div className="flex items-center gap-2 bg-[#E7F9F0] px-4 py-1.5 rounded-full">
                           <div className="w-2 h-2 rounded-full bg-[#01C167]" />
                           <span className="text-[12px] font-black text-[#01C167] uppercase tracking-widest">{t({ en: 'Best Price', fr: 'Meilleur Prix' })}</span>
                        </div>
                     </div>

                     <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4 max-w-[1000px] mx-auto px-4">
                        {providers.map(p => (
                           <div
                              key={p.id}
                              onMouseEnter={() => setFocusedProviderId(p.id)}
                              onMouseLeave={() => setFocusedProviderId(null)}
                              className={`flex-shrink-0 w-[420px] bg-white rounded-[32px] border-2 p-6 flex items-center gap-6 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group ${focusedProviderId === p.id ? 'border-[#01A083]' : 'border-neutral-100'}`}
                              onClick={() => handleSelectProvider(p)}
                           >
                              <div className="relative shrink-0">
                                 <img src={p.avatarUrl} alt={p.name} className="w-24 h-24 rounded-[28px] object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform" />
                                 <div className="absolute -top-2 -right-2 bg-[#01C167] text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border-2 border-white shadow-sm">
                                    {p.badge}
                                 </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-2xl font-black text-black leading-tight truncate">{p.name}</h4>
                                    <div className="text-right shrink-0">
                                       <span className="text-lg font-black text-black">MAD {p.rate}</span>
                                       <span className="text-[10px] font-extrabold text-neutral-400 block uppercase tracking-wider">{p.id === '1' ? '(min)' : ''}</span>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-4 mb-4">
                                    <div className="flex items-center gap-1.5 bg-[#E7F9F0] px-3 py-1.5 rounded-xl">
                                       <CheckCircle2 size={14} className="text-[#01A083]" />
                                       <span className="text-[11px] font-black text-[#01A083] uppercase tracking-widest">NEW</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                       <Sparkles size={16} className="text-[#FFCC02] fill-[#FFCC02]" />
                                       <span className="text-16 font-black text-black">{p.rating.toFixed(1)}</span>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-8 pt-4 border-t border-neutral-50">
                                    <div>
                                       <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{t({ en: 'Experience', fr: 'Expérience' })}</div>
                                       <div className="text-[14px] font-black text-black">{p.taskCount} Serving</div>
                                    </div>
                                    <div>
                                       <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{t({ en: 'Away', fr: 'Distance' })}</div>
                                       <div className="text-[14px] font-black text-black">0 km · ~1 min</div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </motion.div>
               </div>
            );

         case 'setup':
            return (
               <div className="flex-1 flex flex-col h-full bg-white">
                  <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <button onClick={() => setStep('matching')} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-black transition-all">
                           <ChevronLeft size={20} />
                        </button>
                        <div>
                           <h2 className="text-2xl font-black text-black tracking-tight">{t({ en: 'Order Setup', fr: 'Configuration' })}</h2>
                           <p className="text-sm font-bold text-neutral-400">{order.subServiceName}</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
                     <div className="max-w-[700px] mx-auto space-y-12 pb-10">

                        {/* Location Display */}
                        <div className="p-6 bg-[#F8F9FA] rounded-[32px] flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-[#FFCC02]/10 text-[#FFCC02] flex items-center justify-center">
                              <MapPin size={24} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{t({ en: 'Service Location', fr: 'Lieu du service' })}</p>
                              <p className="text-black font-extrabold truncate text-lg">{order.location?.address}</p>
                           </div>
                           <button onClick={() => setStep('location')} className="text-[#FFCC02] font-black text-sm uppercase tracking-widest">{t({ en: 'Edit', fr: 'Modifier' })}</button>
                        </div>

                        {/* Date & Time */}
                        <div className="space-y-6">
                           <h3 className="text-xl font-black text-black flex items-center gap-3">
                              <Calendar className="text-[#FFCC02]" /> {t({ en: 'When do you need it?', fr: 'Quand en avez-vous besoin ?' })}
                           </h3>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="p-5 rounded-[24px] bg-neutral-50 border border-neutral-100 flex flex-col gap-1">
                                 <span className="text-[10px] font-black text-neutral-400 uppercase">{t({ en: 'Select Date', fr: 'Date' })}</span>
                                 <input
                                    type="date"
                                    className="bg-transparent font-bold text-black outline-none w-full"
                                    onChange={(e) => setScheduledDate(new Date(e.target.value))}
                                 />
                              </div>
                              <div className="p-5 rounded-[24px] bg-neutral-50 border border-neutral-100 flex flex-col gap-1">
                                 <span className="text-[10px] font-black text-neutral-400 uppercase">{t({ en: 'Start Time', fr: 'Heure' })}</span>
                                 <select
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="bg-transparent font-bold text-black outline-none w-full appearance-none cursor-pointer"
                                 >
                                    {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                                       <option key={t} value={t}>{t}</option>
                                    ))}
                                 </select>
                              </div>
                           </div>
                        </div>

                        {/* Service Specifics */}
                        <div className="space-y-6">
                           <h3 className="text-xl font-black text-black flex items-center gap-3">
                              <Sparkles className="text-[#FFCC02]" /> {t({ en: 'Service Details', fr: 'Détails du service' })}
                           </h3>

                           {serviceId === 'cleaning' && (
                              <div className="p-6 rounded-[32px] border-2 border-neutral-100 space-y-4">
                                 <label className="text-sm font-black text-black uppercase tracking-widest">{t({ en: 'Number of Rooms', fr: 'Nombre de chambres' })}</label>
                                 <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                       <button
                                          key={n}
                                          onClick={() => setRooms(n)}
                                          className={`w-12 h-12 rounded-full font-black transition-all ${rooms === n ? 'bg-[#01A083] text-white' : 'bg-neutral-50 text-black hover:bg-neutral-100'}`}
                                       >
                                          {n}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {serviceId === 'errands' && (
                              <div className="space-y-4">
                                 <div className="p-6 rounded-[32px] border-2 border-neutral-100 space-y-4">
                                    <label className="text-sm font-black text-black uppercase tracking-widest">{t({ en: 'Category', fr: 'Catégorie' })}</label>
                                    <div className="flex gap-2 flex-wrap">
                                       {['package', 'grocery', 'pharmacy', 'food', 'keys'].map(cat => (
                                          <button
                                             key={cat}
                                             onClick={() => setErrandCategory(cat)}
                                             className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all border-2 ${errandCategory === cat ? 'bg-black text-white border-black shadow-lg' : 'bg-white text-neutral-400 border-neutral-100'}`}
                                          >
                                             {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                          </button>
                                       ))}
                                    </div>
                                 </div>
                                 <div className="p-6 rounded-[32px] border-2 border-neutral-100 space-y-2">
                                    <label className="text-sm font-black text-black uppercase tracking-widest">{t({ en: 'What are we delivering?', fr: 'Que livrons-nous ?' })}</label>
                                    <input
                                       value={itemDescription}
                                       onChange={(e) => setItemDescription(e.target.value)}
                                       placeholder="ex: Apple Store package"
                                       className="w-full bg-transparent font-bold text-lg text-black outline-none placeholder:text-neutral-300"
                                    />
                                 </div>
                              </div>
                           )}

                           <div className="p-6 rounded-[32px] border-2 border-neutral-100 space-y-2">
                              <label className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
                                 <FileText size={16} /> {t({ en: 'Instructions', fr: 'Instructions' })}
                              </label>
                              <textarea
                                 value={note}
                                 onChange={(e) => setNote(e.target.value)}
                                 placeholder="Access codes, specialized tools needed..."
                                 className="w-full h-24 bg-transparent font-medium text-black outline-none placeholder:text-neutral-300 resize-none"
                              />
                           </div>
                        </div>

                        <motion.button
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={handleConfirmSetup}
                           className="w-full py-3 bg-[#01A083] text-white rounded-[42px] font-medium text-2xl transition-all flex items-center justify-center gap-3"
                        >
                           {t({ en: 'View Summary', fr: 'Voir le résumé' })}
                           <ArrowRight size={28} />
                        </motion.button>
                     </div>
                  </div>
               </div>
            );

         case 'summary':
            return (
               <div className="flex-1 p-10 overflow-y-auto no-scrollbar">
                  <button onClick={() => setStep('setup')} className="flex items-center gap-2 text-neutral-400 font-bold mb-6 hover:text-black transition-colors">
                     <ChevronLeft size={20} /> {t({ en: 'Back', fr: 'Retour' })}
                  </button>

                  <h2 className="text-3xl font-black text-black mb-8 tracking-tight">
                     {t({ en: 'Review & Confirm', fr: 'Vérifier & Confirmer' })}
                  </h2>

                  <div className="bg-neutral-50 rounded-[40px] p-10 space-y-8">
                     <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-[28px] bg-white flex items-center justify-center shadow-lg">
                           <img src={serviceIcon} alt="" className="w-12 h-12 object-contain" />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black text-black leading-tight">{order.subServiceName}</h3>
                           <p className="text-neutral-400 font-black uppercase text-xs tracking-widest mt-1">{order.serviceName}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-6">
                        <div className="flex items-start gap-4 p-5 bg-white rounded-3xl border border-neutral-100">
                           <div className="w-10 h-10 rounded-full bg-[#FFF9E5] flex items-center justify-center text-[#FFCC02]">
                              <MapPin size={20} />
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Service Location', fr: 'Lieu du service' })}</p>
                              <p className="text-black font-extrabold truncate">{order.location?.address}</p>
                           </div>
                        </div>

                        <div className="flex items-start gap-4 p-5 bg-white rounded-3xl border border-neutral-100">
                           <div className="w-10 h-10 rounded-full bg-[#FFF9E5] flex items-center justify-center text-[#FFCC02]">
                              <Clock size={20} />
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Scheduled For', fr: 'Programmé pour' })}</p>
                              <p className="text-black font-extrabold capitalize">
                                 {order.scheduledDate ? format(new Date(order.scheduledDate), 'EEEE, MMMM dd') : 'Default Date'} {t({ en: 'at', fr: 'à' })} {order.scheduledTime}
                              </p>
                           </div>
                        </div>

                        {order.description && (
                           <div className="flex items-start gap-4 p-5 bg-white rounded-3xl border border-neutral-100">
                              <div className="w-10 h-10 rounded-full bg-[#FFF9E5] flex items-center justify-center text-[#FFCC02]">
                                 <Sparkles size={20} />
                              </div>
                              <div className="flex-1">
                                 <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Description', fr: 'Description' })}</p>
                                 <p className="text-black font-extrabold italic">"{order.description}"</p>
                              </div>
                           </div>
                        )}
                     </div>

                     <div className="pt-4 flex items-center justify-between px-2">
                        <div className="text-neutral-400 font-bold">{t({ en: 'Estimated Total', fr: 'Total Estimé' })}</div>
                        <div className="text-4xl font-black text-black">
                           ~ {config.subServices.find(s => s.id === order.subServiceId)?.pricingArchetype === 'fixed' ? '25' : '---'} <span className="text-sm opacity-40">MAD</span>
                        </div>
                     </div>
                  </div>

                  <button
                     onClick={() => {
                        alert('Order broadcasted! (Integration with firebase call coming next)');
                        onClose();
                     }}
                     className="mt-10 w-full py-6 bg-black text-white rounded-[28px] font-black text-2xl hover:shadow-2xl transition-all relative overflow-hidden group"
                  >
                     <span className="relative z-10">{t({ en: 'Broadcast Order', fr: 'Diffuser la demande' })}</span>
                     <div className="absolute inset-0 bg-[#FFCC02] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </button>
               </div>
            );
      }
   };

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
                  className="relative bg-white w-full max-w-[1100px] h-[85vh] rounded-[48px] overflow-hidden shadow-2xl flex"
               >
                  {/* Modal Content - Left Side */}
                  <div className="flex-1 flex flex-col h-full bg-white">
                     {renderStep()}
                  </div>

                  {/* Modal Sidebar - Right Side */}
                  <div className="w-[400px] bg-[#F8F9FA] border-l border-neutral-100 p-10 flex flex-col">
                     <div className="flex justify-end">
                        <button onClick={onClose} className="w-12 h-12 rounded-full bg-white border border-neutral-100 flex items-center justify-center text-neutral-400 hover:text-black hover:shadow-md transition-all">
                           <X size={24} />
                        </button>
                     </div>

                     <div className="mt-8 flex flex-col items-center text-center">
                        <div className="w-48 h-48 mb-8 relative">
                           <div className="absolute inset-0 bg-[#FFCC02]/10 rounded-full blur-3xl" />
                           <img
                              src={serviceIcon}
                              alt={config.name}
                              className="w-full h-full object-contain relative z-10"
                           />
                        </div>

                        <h3 className="text-3xl font-black text-black mb-4 uppercase tracking-tighter">
                           {order.subServiceName || config.name}
                        </h3>

                        <div className="w-12 h-1.5 bg-[#FFCC02] rounded-full mb-8" />

                        <p className="text-neutral-500 text-lg font-medium leading-relaxed mb-10">
                           {t({
                              en: 'Program your professional service in less than a minute. Quality guaranteed.',
                              fr: 'Programmez votre service professionnel en moins d\'une minute. Qualité garantie.'
                           })}
                        </p>

                        <div className="mt-auto space-y-4 w-full">
                           <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-neutral-100">
                              <div className="w-10 h-10 rounded-full bg-[#E7F9F0] text-[#01C167] flex items-center justify-center font-bold">
                                 <CheckCircle2 size={20} />
                              </div>
                              <div className="text-left">
                                 <div className="text-sm font-black text-black">{t({ en: 'Quality Verified', fr: 'Qualité Vérifiée' })}</div>
                                 <div className="text-xs font-bold text-neutral-400">{t({ en: 'Top professionals only', fr: 'Pros sélectionnés' })}</div>
                              </div>
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
