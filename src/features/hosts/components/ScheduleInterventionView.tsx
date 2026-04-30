"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, MoreHorizontal, Calendar, 
    Clock, User, Shield, CheckCircle2, 
    Plus, Trash2, Info, MapPin, 
    Bot, Users, ShoppingCart, Sparkles, Star
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';

interface ScheduleInterventionViewProps {
    property: any;
    onClose: () => void;
    onConfirm?: (jobs: any[]) => void;
}

const ScheduleInterventionView: React.FC<ScheduleInterventionViewProps> = ({ property, onClose, onConfirm }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Mock programmed dates if not present
    const [programmedDates] = useState(property.programmedDates || [
        { date: '2026-04-28', type: 'Checkout' },
        { date: '2026-05-04', type: 'Check-in' },
        { date: '2026-05-13', type: 'Checkout' },
        { date: '2026-05-18', type: 'Check-in' },
        { date: '2026-05-24', type: 'Checkout' }
    ]);

    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const activeDate = programmedDates[selectedDateIndex];

    // Activities state
    const [activities, setActivities] = useState<any[]>([]);
    const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [selectedActivityForTeam, setSelectedActivityForTeam] = useState<string | null>(null);
    const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);

    // Get property allowed services (those selected in wizard)
    const propertyServiceIds = property.automation?.services || [];
    const availableServices = SERVICES_CATALOGUE.filter(s => propertyServiceIds.includes(s.id));

    useEffect(() => {
        const fetchTeam = async () => {
            if (!property?.id) return;
            try {
                const snap = await getDocs(collection(db, 'properties', property.id, 'team'));
                setTeamMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error fetching team:", err);
            }
        };
        fetchTeam();
    }, [property?.id]);

    useEffect(() => {
        if (!property) return;

        const automation = property.automation || {};
        const autoServices = automation.services || [];
        
        const initialActivities = autoServices.map((serviceId: string) => {
            const catalogService = SERVICES_CATALOGUE.find(s => s.id === serviceId);
            return {
                id: `${serviceId}-${Math.random()}`,
                serviceId,
                label: catalogService?.labelFr || serviceId,
                iconPath: catalogService?.iconPath,
                time: automation.cleaningTime || "11:30",
                isAutomatic: true,
                date: activeDate.date,
                executor: { type: 'bricoler', isAutoMatch: true, name: 'Karen M.' } // Mock auto-match
            };
        });

        // Add Restocking if configured
        if (automation.errandsEnabled) {
            const errandsSvc = SERVICES_CATALOGUE.find(s => s.id === 'errands');
            initialActivities.push({
                id: `restocking-${Math.random()}`,
                serviceId: 'errands',
                label: 'Restockage & Courses',
                iconPath: errandsSvc?.iconPath || '/Images/Vectors Illu/shoppingbag.webp',
                time: "10:00",
                isAutomatic: true,
                date: activeDate.date,
                executor: { type: 'bricoler', isAutoMatch: true, name: 'Courier Bricoler' }
            });
        }

        setActivities(initialActivities);
    }, [property, activeDate.date]);

    const addActivity = (service: any) => {
        const newActivity = {
            id: `${service.id}-${Math.random()}`,
            serviceId: service.id,
            label: service.labelFr,
            iconPath: service.iconPath,
            time: "12:00",
            isAutomatic: false,
            date: activeDate.date,
            executor: null // Unassigned state (c)
        };
        setActivities(prev => [...prev, newActivity]);
        setIsAddServiceOpen(false);
    };

    const removeActivity = (id: string) => {
        setActivities(prev => prev.filter(a => a.id !== id));
    };

    const handleConfirm = async () => {
        if (!auth.currentUser) return;
        setIsSubmitting(true);

        try {
            const jobPromises = activities.map(activity => {
                return addDoc(collection(db, 'jobs'), {
                    clientId: auth.currentUser?.uid,
                    propertyId: property.id,
                    status: 'new',
                    service: activity.serviceId,
                    subService: activity.label,
                    subServiceDisplayName: activity.label,
                    address: property?.specs?.address || '',
                    date: activity.date,
                    time: activity.time,
                    isHostJob: true,
                    isAutomatic: activity.isAutomatic,
                    executor: activity.executor,
                    createdAt: serverTimestamp(),
                });
            });

            await Promise.all(jobPromises);

            showToast({
                variant: 'success',
                title: t({ en: 'Planning confirmed!', fr: 'Planning confirmé !' })
            });

            if (onConfirm) onConfirm(activities);
            onClose();
        } catch (err) {
            console.error("Error confirming planning:", err);
            showToast({
                variant: 'error',
                title: 'Erreur',
                description: 'Impossible de confirmer le planning.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10500] bg-white flex flex-col no-scrollbar">
            {/* Header */}
            <div className="p-6 pb-2 flex items-center gap-4">
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-50 rounded-full transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
                <h3 className="text-[20px] font-bold">Programmer l'intervention</h3>
            </div>

            {/* Date Pills */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar px-6 py-4">
                {programmedDates.map((item: any, idx: number) => {
                    const dateObj = new Date(item.date);
                    const isSelected = selectedDateIndex === idx;
                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedDateIndex(idx)}
                            className="flex flex-col items-center min-w-[100px] gap-1"
                        >
                            <div className={`w-full py-3 px-4 rounded-xl border-2 font-bold text-[15px] transition-all text-center ${isSelected ? 'bg-[#2C2C2C] border-[#2C2C2C] text-white shadow-lg' : 'bg-[#F7F7F7] border-transparent text-neutral-500'}`}>
                                {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </div>
                            <span className="text-[12px] font-medium text-neutral-400 capitalize">{item.type}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto pb-32">
                {/* Property Header */}
                <div className="px-6 mt-6">
                    <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-neutral-100 shadow-sm">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                            <Image 
                                src={property.photos?.[0] || 'https://source.unsplash.com/800x600/?apartment'} 
                                fill 
                                className="object-cover" 
                                alt="" 
                            />
                            <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[17px] truncate">{property.name}</h4>
                            <p className="text-[13px] text-neutral-500 truncate">Logement · {property.specs?.address || 'Maroc'}</p>
                        </div>
                    </div>
                </div>

                {/* Selected Event Details */}
                <div className="px-6 mt-8 flex justify-between items-start">
                    <div>
                        <h4 className="text-[22px] font-bold">{activeDate.type}</h4>
                        <p className="text-neutral-400 font-medium">
                            {new Date(activeDate.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <div className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white shadow-sm font-bold text-[17px]">
                        11:30
                    </div>
                </div>

                <div className="w-full h-[1px] bg-neutral-100 my-8 mx-6 w-[calc(100%-48px)]" />

                {/* Activities Section */}
                <div className="px-6">
                    <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[20px] font-bold">Activités Programmées pour aujourd’hui</h4>
                        <button 
                            onClick={() => setIsAddServiceOpen(true)}
                            className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center text-neutral-500 active:scale-90 transition-all"
                        >
                            <Plus size={22} />
                        </button>
                    </div>

                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {activities.map((activity) => (
                            <div key={activity.id} className="min-w-[220px] p-5 rounded-[24px] border border-neutral-100 bg-white shadow-sm flex flex-col items-center text-center relative group">
                                <button 
                                    className="absolute top-4 right-4 text-neutral-300 hover:text-black transition-colors p-1"
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                <div className="w-12 h-12 flex items-center justify-center mb-4">
                                    {activity.iconPath ? (
                                        <img src={activity.iconPath} className="w-10 h-10 object-contain grayscale opacity-80" alt="" />
                                    ) : (
                                        <Sparkles size={32} className="text-neutral-300" />
                                    )}
                                </div>

                                <h5 className="font-bold text-[16px] mb-4 leading-tight max-w-[140px]">{activity.label}</h5>
                                
                                {activity.isAutomatic && (
                                    <div className="mb-4 px-3 py-1 rounded-full bg-neutral-50 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                        Automatique · basé sur vos préférences
                                    </div>
                                )}

                                <div className="w-full space-y-2">
                                    <div className="w-full py-2.5 rounded-xl border border-neutral-100 bg-[#F7F7F7]/50 font-bold text-[15px]">
                                        {activity.time}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button className="w-full py-2.5 rounded-xl bg-[#F7F7F7] text-neutral-600 font-bold text-[13px] active:scale-95 transition-all">
                                            Changer date
                                        </button>
                                        <p className="text-[9px] text-neutral-400 font-medium leading-tight">
                                            Se détache de l'événement principal
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full h-[1px] bg-neutral-100 my-10 mx-6 w-[calc(100%-48px)]" />

                {/* Team Section */}
                <div className="px-6">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[20px] font-bold">Équipe</h4>
                        <button className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center text-neutral-500 active:scale-90 transition-all">
                            <Plus size={22} />
                        </button>
                    </div>

                    <div className="space-y-12">
                        {activities.map((activity) => (
                            <div key={`team-${activity.id}`} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-[14px] font-bold text-neutral-400 uppercase tracking-wider">{activity.label}</h5>
                                    {activity.isAutomatic && (
                                        <span className="text-[10px] font-bold text-[#00A684] bg-[#00A684]/10 px-2 py-0.5 rounded uppercase">Basé sur préférences</span>
                                    )}
                                </div>
                                
                                {activity.executor ? (
                                    /* State (a) or (b) */
                                    <div className="p-5 rounded-[32px] border border-neutral-100 bg-white shadow-sm relative overflow-hidden">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-neutral-50 shadow-sm relative">
                                                <Image 
                                                    src={activity.executor.type === 'bricoler' ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop" : "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop"} 
                                                    fill 
                                                    className="object-cover" 
                                                    alt="" 
                                                />
                                                {activity.executor.isAutoMatch && (
                                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                                                        <Sparkles size={8} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h6 className="font-bold text-[18px]">{activity.executor.name || 'Karen M.'}</h6>
                                                    <span className="font-bold text-[16px]">105.93 MAD/hr</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                        <Trophy size={10} /> Elite
                                                    </span>
                                                    {activity.executor.type === 'team' && (
                                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                                                            Votre équipe
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[13px] text-neutral-500 font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                        <span className="text-black font-bold">5.0</span>
                                                        <span>(227 avis)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button className="py-3.5 rounded-2xl bg-[#00A684] text-white font-bold text-[15px] active:scale-[0.98] transition-all shadow-lg shadow-[#00A684]/20">
                                                Consultez
                                            </button>
                                            <button className="py-3.5 rounded-2xl bg-[#F7F7F7] text-black font-bold text-[15px] active:scale-[0.98] transition-all">
                                                Changer
                                            </button>
                                        </div>

                                        {activity.executor.isAutoMatch && (
                                            <div className="absolute top-0 right-0 px-4 py-1 bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">
                                                Assigné automatiquement
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* State (c) Unassigned */
                                    <button 
                                        onClick={() => {
                                            setSelectedActivityForTeam(activity.id);
                                            setIsTeamSelectorOpen(true);
                                        }}
                                        className="w-full p-6 rounded-[24px] border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center gap-3 text-neutral-500 font-bold hover:bg-neutral-100 transition-all active:scale-[0.99]"
                                    >
                                        <User size={20} />
                                        {t({ en: 'Choose a team member', fr: 'Choisir un membre de l\'équipe' })}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Guest Services & Future Services Section */}
                    {((property.automation?.guestServices || []).length > 0 || (property.automation?.futureServices || []).length > 0) && (
                        <div className="mt-10 mb-8">
                            <h4 className="text-[20px] font-bold mb-4">{t({ en: 'Suggested services', fr: 'Services suggérés' })}</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {[...(property.automation?.guestServices || []), ...(property.automation?.futureServices || [])].map((svcId: string) => {
                                    const svc = SERVICES_CATALOGUE.find(s => s.id === svcId);
                                    if (!svc) return null;
                                    return (
                                        <button
                                            key={svcId}
                                            onClick={() => addActivity(svc)}
                                            className="p-4 rounded-[20px] border border-neutral-100 bg-[#F7F7F7] flex flex-col items-center text-center gap-3 hover:border-black transition-all group"
                                        >
                                            {svc.iconPath ? (
                                                <img src={svc.iconPath} className="w-8 h-8 object-contain grayscale group-hover:grayscale-0 transition-all" alt="" />
                                            ) : (
                                                <Sparkles size={24} className="text-neutral-400 group-hover:text-black transition-all" />
                                            )}
                                            <span className="font-bold text-[13px] leading-tight">{svc.labelFr}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Add Service Modal */}
                    <AnimatePresence>
                        {isAddServiceOpen && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[11000] bg-black/60 backdrop-blur-md flex items-end justify-center px-4 pb-12"
                                onClick={() => setIsAddServiceOpen(false)}
                            >
                                <motion.div 
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    className="bg-white w-full max-w-[500px] rounded-[42px] p-8 shadow-2xl relative overflow-hidden"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-[24px] font-bold">Ajouter une activité</h3>
                                        <button onClick={() => setIsAddServiceOpen(false)} className="p-2 rounded-full bg-neutral-100"><Plus className="rotate-45" size={20} /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto no-scrollbar pb-6">
                                        {availableServices.map((svc) => (
                                            <button
                                                key={svc.id}
                                                onClick={() => addActivity(svc)}
                                                className="p-5 rounded-3xl border border-neutral-100 bg-[#F7F7F7] flex flex-col items-center text-center gap-3 hover:border-black transition-all group"
                                            >
                                                <img src={svc.iconPath} className="w-10 h-10 object-contain grayscale group-hover:grayscale-0 transition-all" alt="" />
                                                <span className="font-bold text-[14px]">{svc.labelFr}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Team Selector Modal */}
            <AnimatePresence>
                {isTeamSelectorOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[11000] bg-black/60 backdrop-blur-md flex items-end justify-center px-4 pb-12"
                        onClick={() => setIsTeamSelectorOpen(false)}
                    >
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-[500px] rounded-[42px] p-8 shadow-2xl relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[24px] font-bold">{t({ en: 'Assign member', fr: 'Assigner un membre' })}</h3>
                                <button onClick={() => setIsTeamSelectorOpen(false)} className="p-2 rounded-full bg-neutral-100"><X size={20} /></button>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pb-6">
                                {teamMembers.length > 0 ? (
                                    teamMembers.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => {
                                                setActivities(prev => prev.map(a => 
                                                    a.id === selectedActivityForTeam ? { 
                                                        ...a, 
                                                        executor: { 
                                                            id: member.id, 
                                                            type: 'team', 
                                                            name: member.name, 
                                                            isAutoMatch: false 
                                                        } 
                                                    } : a
                                                ));
                                                setIsTeamSelectorOpen(false);
                                            }}
                                            className="w-full flex items-center gap-4 p-4 rounded-3xl border border-neutral-100 hover:border-black transition-all bg-[#F7F7F7]"
                                        >
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0">
                                                {member.photoURL ? <img src={member.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-neutral-300" />}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="font-bold text-[16px] text-black">{member.name}</div>
                                                <div className="text-[12px] text-neutral-400">{member.role === 'admin' ? 'Administrateur' : 'Personnel'}</div>
                                            </div>
                                            <Plus size={20} className="text-neutral-300" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-10 space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-neutral-50 flex items-center justify-center mx-auto">
                                            <Users size={32} className="text-neutral-200" />
                                        </div>
                                        <p className="text-neutral-500 font-medium">{t({ en: 'No team members linked to this property.', fr: 'Aucun membre d\'équipe lié à cette propriété.' })}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex flex-col gap-4 z-[10600]">
                <button
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                    className="w-full py-5 bg-[#2C2C2C] text-white rounded-3xl font-bold text-[18px] active:scale-[0.98] transition-all shadow-xl shadow-black/10 disabled:opacity-50"
                >
                    {isSubmitting ? 'Confirmation...' : 'Confirmer le planning'}
                </button>
            </div>
        </div>
    );
};

const Trophy = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);

export default ScheduleInterventionView;
