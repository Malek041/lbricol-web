"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, MoreHorizontal, Calendar,
    Clock, User, Shield, CheckCircle2,
    Plus, Trash2, Info, MapPin,
    Bot, Users, ShoppingCart, Sparkles, Star, X,
    ChevronDown
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import Image from 'next/image';

interface ScheduleInterventionViewProps {
    property: any;
    selectedDates?: string[];
    onClose: () => void;
    onConfirm?: (jobs: any[]) => void;
}

interface DateIntervention {
    date: string;
    type: 'Checkout' | 'Check-in' | 'Autres';
    time: string;
    activities: any[];
}

const ScheduleInterventionView: React.FC<ScheduleInterventionViewProps> = ({ property, selectedDates, onClose, onConfirm }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial state based on selected dates
    const [interventions, setInterventions] = useState<DateIntervention[]>([]);
    const [selectedDateIndex, setSelectedDateIndex] = useState(0);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
    const [isTeamSelectorOpen, setIsTeamSelectorOpen] = useState(false);
    const [selectedActivityForTeam, setSelectedActivityForTeam] = useState<string | null>(null);
    const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);
    const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
    const [selectedActivityForDate, setSelectedActivityForDate] = useState<string | null>(null);

    const activeIntervention = interventions[selectedDateIndex];

    // Fetch Team
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

    // Initialize interventions from selectedDates and automation settings
    useEffect(() => {
        if (!selectedDates || selectedDates.length === 0) return;

        const automation = property.automation || {};
        const teamType = automation.teamType || 'lbricol';

        const initialInterventions: DateIntervention[] = selectedDates.map(date => {
            // Default type to Checkout for now
            const type: 'Checkout' | 'Check-in' | 'Autres' = 'Checkout';
            const activities: any[] = [];

            // 1. Cleaning logic
            if (automation.cleaningDetails) {
                const { subServices } = automation.cleaningDetails;
                // If it's a checkout date and hospitality cleaning is enabled
                if (type === 'Checkout' && subServices?.includes('hospitality')) {
                    const svc = SERVICES_CATALOGUE.find(s => s.id === 'cleaning');
                    activities.push({
                        id: `cleaning-${Math.random()}`,
                        serviceId: 'cleaning',
                        label: 'Nettoyage post-checkout',
                        iconPath: svc?.iconPath,
                        time: automation.cleaningDetails.frequencies?.hospitality || "11:00",
                        isAutomatic: true,
                        executor: teamType === 'lbricol' ? { type: 'bricoler', isAutoMatch: true, name: 'Bricoler Pro' } : null
                    });
                }
            }

            // 2. Restocking logic
            if (automation.errandsEnabled) {
                const svc = SERVICES_CATALOGUE.find(s => s.id === 'errands');
                activities.push({
                    id: `errands-${Math.random()}`,
                    serviceId: 'errands',
                    label: 'Restockage & Courses',
                    iconPath: svc?.iconPath,
                    time: "10:00",
                    isAutomatic: true,
                    executor: teamType === 'lbricol' ? { type: 'bricoler', isAutoMatch: true, name: 'Courier Bricoler' } : null
                });
            }

            // 3. Pets logic
            if (automation.petsDetails && (automation.petsDetails.petTypes || []).length > 0) {
                const svc = SERVICES_CATALOGUE.find(s => s.id === 'pets_care');
                activities.push({
                    id: `pets-${Math.random()}`,
                    serviceId: 'pets_care',
                    label: 'Soin des animaux',
                    iconPath: svc?.iconPath,
                    time: "09:00",
                    isAutomatic: true,
                    executor: teamType === 'lbricol' ? { type: 'bricoler', isAutoMatch: true, name: 'Bricoler Pets' } : null
                });
            }

            return {
                date,
                type,
                time: "11:00",
                activities
            };
        });

        setInterventions(initialInterventions);
    }, [selectedDates, property]);

    const updateActiveIntervention = (updates: Partial<DateIntervention>) => {
        setInterventions(prev => prev.map((item, idx) => 
            idx === selectedDateIndex ? { ...item, ...updates } : item
        ));
    };

    const addActivity = (service: any) => {
        const newActivity = {
            id: `${service.id}-${Math.random()}`,
            serviceId: service.id,
            label: service.labelFr,
            iconPath: service.iconPath,
            time: "12:00",
            date: activeIntervention?.date,
            isAutomatic: false,
            executor: null
        };
        updateActiveIntervention({
            activities: [...(activeIntervention?.activities || []), newActivity]
        });
        setIsAddServiceOpen(false);
    };

    const removeActivity = (id: string) => {
        updateActiveIntervention({
            activities: (activeIntervention?.activities || []).filter(a => a.id !== id)
        });
    };

    const handleConfirm = async () => {
        if (!auth.currentUser) return;
        setIsSubmitting(true);

        try {
            const allJobs: any[] = [];
            interventions.forEach(interv => {
                interv.activities.forEach(activity => {
                    allJobs.push({
                        clientId: auth.currentUser?.uid,
                        propertyId: property.id,
                        status: 'new',
                        service: activity.serviceId,
                        subService: activity.label,
                        subServiceDisplayName: activity.label,
                        address: property?.specs?.address || '',
                        date: interv.date,
                        time: activity.time,
                        isHostJob: true,
                        isAutomatic: activity.isAutomatic,
                        executor: activity.executor,
                        createdAt: serverTimestamp(),
                    });
                });
            });

            const jobPromises = allJobs.map(job => addDoc(collection(db, 'jobs'), job));
            await Promise.all(jobPromises);

            showToast({
                variant: 'success',
                title: t({ en: 'Planning confirmed!', fr: 'Planning confirmé !' })
            });

            if (onConfirm) onConfirm(allJobs);
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

    if (!activeIntervention) return null;

    return (
        <motion.div 
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[10500] bg-white flex flex-col no-scrollbar"
        >
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
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 py-4">
                {interventions.map((item, idx) => {
                    const [y, m, d] = item.date.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, d);
                    const isSelected = selectedDateIndex === idx;
                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedDateIndex(idx)}
                            className={`relative whitespace-nowrap py-2.5 px-6 rounded-[5px] font-bold text-[15px] transition-all border ${isSelected ? 'border-transparent text-white' : 'bg-[#F7F7F7] border-transparent text-neutral-400 hover:text-black'}`}
                        >
                            {isSelected && (
                                <motion.div
                                    layoutId="selectedDatePill"
                                    className="absolute inset-0 bg-[#2C2C2C] rounded-[5px] z-0"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10">
                                {dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        </button>
                    );
                })}
            </div>

            <AnimatePresence mode="wait">
                <motion.div 
                    key={selectedDateIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex-1 overflow-y-auto pb-32 no-scrollbar"
                >
                    {/* Property Header */}
                    <div className="px-6 mt-6">
                        <div className="flex items-center gap-4 p-4 rounded-[5px] bg-white border border-neutral-100/50">
                            <div className="relative w-14 h-14 rounded-[5px] overflow-hidden shrink-0">
                                <Image
                                    src={property.photos?.[0] || 'https://source.unsplash.com/800x600/?apartment'}
                                    fill
                                    className="object-cover"
                                    alt=""
                                />
                                <div className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-[16px] truncate">{property.name}</h4>
                                <p className="text-[12px] text-neutral-400 truncate">Logement · {property.specs?.address || 'Maroc'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Selected Event Details */}
                    <div className="px-6 mt-8 flex justify-between items-start">
                        <button 
                            onClick={() => setIsTypeSelectorOpen(true)}
                            className="flex flex-col items-start text-left"
                        >
                            <div className="flex items-center gap-2">
                                <h4 className="text-[28px] font-black leading-tight tracking-tight">{activeIntervention.type}</h4>
                                <ChevronDown size={20} className="text-neutral-300" />
                            </div>
                            <p className="text-neutral-400 font-bold">
                                {(() => {
                                    const [y, m, d] = activeIntervention.date.split('-').map(Number);
                                    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                                })()}
                            </p>
                        </button>
                        
                        <div className="relative group">
                            <input 
                                type="time" 
                                value={activeIntervention.time}
                                onChange={(e) => updateActiveIntervention({ time: e.target.value })}
                                className="px-4 py-2.5 rounded-[5px] border border-neutral-200 bg-white font-bold text-[17px] focus:outline-none focus:border-black appearance-none text-center"
                            />
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-neutral-100 my-8 mx-6 w-[calc(100%-48px)]" />

                    {/* Activities Section */}
                    <div className="px-6">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[20px] font-bold">Activités Programmées</h4>
                            <button
                                onClick={() => setIsAddServiceOpen(true)}
                                className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center text-neutral-500 active:scale-90 transition-all"
                            >
                                <Plus size={22} />
                            </button>
                        </div>

                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {activeIntervention.activities.length > 0 ? (
                                activeIntervention.activities.map((activity) => {
                                    const catalogService = SERVICES_CATALOGUE.find(s => s.id === activity.serviceId);
                                    const iconPath = activity.iconPath || catalogService?.iconPath;

                                    return (
                                        <div key={activity.id} className="min-w-[180px] p-6 rounded-[5px] border border-neutral-100 bg-white flex flex-col items-center text-center relative group">
                                            <button
                                                onClick={() => removeActivity(activity.id)}
                                                className="absolute top-4 right-4 text-neutral-300 hover:text-black transition-colors p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="w-10 h-10 flex items-center justify-center mb-2 relative">
                                                {iconPath ? (
                                                    <Image src={iconPath} fill className="object-contain" alt="" />
                                                ) : (
                                                    <Sparkles size={28} className="text-black" />
                                                )}
                                            </div>

                                            <h5 className="font-medium text-[14px] text-neutral-500 mb-1 leading-tight">{activity.label}</h5>

                                            <input 
                                                type="time" 
                                                value={activity.time}
                                                onChange={(e) => {
                                                    updateActiveIntervention({
                                                        activities: activeIntervention.activities.map(a => 
                                                            a.id === activity.id ? { ...a, time: e.target.value } : a
                                                        )
                                                    });
                                                }}
                                                className="text-[36px] font-bold text-black mb-4 tabular-nums w-full text-center bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                                            />
                                            
                                            <div className="relative w-full">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedActivityForDate(activity.id);
                                                        setIsDateSelectorOpen(true);
                                                    }}
                                                    className="w-full py-2 px-4 rounded-full bg-[#F7F7F7] text-neutral-600 font-bold text-[12px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                                                >
                                                    <Calendar size={14} className="text-neutral-400" />
                                                    {(() => {
                                                        const dateStr = activity.date || activeIntervention.date;
                                                        const [y, m, d] = dateStr.split('-').map(Number);
                                                        return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                                                    })()}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="w-full py-10 border-2 border-dashed border-neutral-100 rounded-[5px] flex flex-col items-center justify-center text-neutral-400">
                                    <Bot size={32} className="mb-2 opacity-20" />
                                    <p className="text-[14px] font-medium">Aucune activité automatique détectée</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full h-[1px] bg-neutral-100 my-10 mx-6 w-[calc(100%-48px)]" />

                    {/* Team Section */}
                    <div className="px-6">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-[20px] font-bold">Équipe</h4>
                            <button 
                                onClick={() => setIsTeamSelectorOpen(true)}
                                className="w-10 h-10 rounded-full bg-[#F7F7F7] flex items-center justify-center text-neutral-500 active:scale-90 transition-all"
                            >
                                <Plus size={22} />
                            </button>
                        </div>

                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6">
                            {activeIntervention.activities.map((activity) => (
                                <div key={`team-${activity.id}`} className="min-w-[300px] space-y-4">
                                    <h5 className="text-[14px] font-medium text-neutral-400 lowercase first-letter:uppercase tracking-wide px-1">{activity.label}</h5>

                                    {activity.executor ? (
                                        <div className="p-6 rounded-[12px] border border-neutral-100 bg-white flex flex-col gap-4">
                                            {/* Top Section: Avatar & Basic Info */}
                                            <div className="flex gap-4">
                                                <div className="relative w-16 h-16 flex-shrink-0">
                                                    {activity.executor.photoURL ? (
                                                        <img src={activity.executor.photoURL} className="w-full h-full object-cover rounded-full" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-300 rounded-full">
                                                            <User size={24} />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h6 className="font-bold text-[17px] text-black truncate">{activity.executor.name}</h6>
                                                        {activity.executor.isAutoMatch && (
                                                            <span className="font-black text-[12px] text-[#00A684] shrink-0">Auto-match</span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-[3px] text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                                            🏆 ELITE
                                                        </span>
                                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-[3px] text-[9px] font-black uppercase tracking-wider">
                                                            TRUSTED
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-[13px] text-black font-bold">
                                                        <Star size={14} fill="black" stroke="black" />
                                                        <span>5.0 (20+ {t({ en: 'reviews', fr: 'avis' })})</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bio Bubble Placeholder */}
                                            <div className="bg-neutral-50 rounded-[8px] p-3 relative">
                                                <p className="text-[13px] text-neutral-600 line-clamp-2 leading-relaxed font-medium italic">
                                                    "{t({ 
                                                        en: 'Experienced professional dedicated to maintaining your property to the highest standards.', 
                                                        fr: 'Professionnel expérimenté dédié au maintien de votre propriété aux standards les plus élevés.' 
                                                    })}"
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col gap-2 mt-auto">
                                                <button className="w-full py-3 bg-[#01A083] text-white rounded-full font-black text-[17px] active:scale-[0.98] transition-all">
                                                    Consultez profile
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedActivityForTeam(activity.id);
                                                        setIsTeamSelectorOpen(true);
                                                    }}
                                                    className="w-full py-3 bg-neutral-100 text-black rounded-full font-black text-[17px] active:scale-[0.98] transition-all border border-neutral-200/50"
                                                >
                                                    Changer
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedActivityForTeam(activity.id);
                                                setIsTeamSelectorOpen(true);
                                            }}
                                            className="w-full p-6 rounded-[5px] border-2 border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center gap-3 text-neutral-500 font-bold hover:bg-neutral-100 transition-all active:scale-[0.99]"
                                        >
                                            <User size={20} />
                                            {t({ en: 'Choose a team member', fr: 'Choisir un membre de l\'équipe' })}
                                        </button>
                                    )}
                                </div>
                            ))}
                            
                            {activeIntervention.activities.length === 0 && (
                                <div className="w-full text-center py-10 opacity-40">
                                    <p className="text-[14px]">Aucune activité pour assigner une équipe</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Type Selector Bottom Sheet */}
            <AnimatePresence>
                {isTypeSelectorOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[11000] bg-black/60 backdrop-blur-md flex items-end justify-center px-4 pb-12"
                        onClick={() => setIsTypeSelectorOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-[500px] rounded-[5px] p-8 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[24px] font-bold">Type d'intervention</h3>
                                <button onClick={() => setIsTypeSelectorOpen(false)} className="p-2 rounded-full bg-neutral-100"><X size={20} /></button>
                            </div>

                            <div className="space-y-3">
                                {['Checkout', 'Check-in', 'Autres'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            updateActiveIntervention({ type: type as any });
                                            setIsTypeSelectorOpen(false);
                                        }}
                                        className={`w-full p-5 rounded-[5px] border font-bold text-[18px] text-left transition-all ${activeIntervention.type === type ? 'bg-black text-white border-black' : 'bg-[#F7F7F7] border-neutral-100 text-black'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            className="bg-white w-full max-w-[500px] rounded-[5px] p-8 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[24px] font-bold">Ajouter une activité</h3>
                                <button onClick={() => setIsAddServiceOpen(false)} className="p-2 rounded-full bg-neutral-100"><Plus className="rotate-45" size={20} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto no-scrollbar pb-6">
                                {SERVICES_CATALOGUE.map((svc) => (
                                    <button
                                        key={svc.id}
                                        onClick={() => addActivity(svc)}
                                        className="p-5 rounded-[5px] border border-neutral-100 bg-[#F7F7F7] flex flex-col items-center text-center gap-3 hover:border-black transition-all group"
                                    >
                                        {svc.iconPath ? (
                                            <img src={svc.iconPath} className="w-10 h-10 object-contain grayscale group-hover:grayscale-0 transition-all" alt="" />
                                        ) : (
                                            <Sparkles size={24} className="text-neutral-400 group-hover:text-black" />
                                        )}
                                        <span className="font-bold text-[14px]">{svc.labelFr}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            className="bg-white w-full max-w-[500px] rounded-[5px] p-8 relative overflow-hidden"
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
                                                updateActiveIntervention({
                                                    activities: activeIntervention.activities.map(a => 
                                                        a.id === selectedActivityForTeam ? {
                                                            ...a,
                                                            executor: {
                                                                id: member.id,
                                                                type: 'team',
                                                                name: member.name,
                                                                photoURL: member.photoURL,
                                                                isAutoMatch: false
                                                            }
                                                        } : a
                                                    )
                                                });
                                                setIsTeamSelectorOpen(false);
                                            }}
                                            className="w-full flex items-center gap-4 p-4 rounded-[5px] border border-neutral-100 hover:border-black transition-all bg-[#F7F7F7]"
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
                                        <button className="px-6 py-2 rounded-full bg-black text-white font-bold text-[14px]">Inviter mon équipe</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Activity Date Selector Modal */}
            <AnimatePresence>
                {isDateSelectorOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[11000] bg-black/60 backdrop-blur-md flex items-end justify-center px-4 pb-12"
                        onClick={() => setIsDateSelectorOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full max-w-[500px] rounded-[5px] p-8 relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[24px] font-bold">Choisir la date</h3>
                                <button onClick={() => setIsDateSelectorOpen(false)} className="p-2 rounded-full bg-neutral-100"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                {(() => {
                                    // Use the first intervention date as starting point for calendar month
                                    const firstInterv = interventions[0]?.date || new Date().toISOString().split('T')[0];
                                    const [cYear, cMonthIdx] = firstInterv.split('-').map(Number);
                                    
                                    const daysInMonth = new Date(cYear, cMonthIdx, 0).getDate();
                                    const firstDay = new Date(cYear, cMonthIdx - 1, 1).getDay();
                                    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust to Monday start

                                    const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
                                    const monthName = new Date(cYear, cMonthIdx - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

                                    return (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center justify-between px-2">
                                                <h4 className="text-[18px] font-bold capitalize">{monthName}</h4>
                                            </div>
                                            
                                            <div className="grid grid-cols-7 gap-1">
                                                {dayNames.map((d, i) => (
                                                    <div key={`${d}-${i}`} className="h-10 flex items-center justify-center text-[12px] font-bold text-neutral-300">{d}</div>
                                                ))}
                                                
                                                {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                                                    <div key={`empty-${i}`} className="h-12" />
                                                ))}

                                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                                    const day = i + 1;
                                                    const dateStr = `${cYear}-${String(cMonthIdx).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                    const isInterventionDay = interventions.some(inv => inv.date === dateStr);
                                                    
                                                    const currentActivity = activeIntervention.activities.find(a => a.id === selectedActivityForDate);
                                                    const isSelected = (currentActivity?.date || activeIntervention.date) === dateStr;
                                                    
                                                    const today = new Date().toISOString().split('T')[0];
                                                    const isToday = dateStr === today;

                                                    return (
                                                        <button
                                                            key={day}
                                                            onClick={() => {
                                                                updateActiveIntervention({
                                                                    activities: activeIntervention.activities.map(a => 
                                                                        a.id === selectedActivityForDate ? { ...a, date: dateStr } : a
                                                                    )
                                                                });
                                                                setIsDateSelectorOpen(false);
                                                            }}
                                                            className={`h-12 rounded-[5px] flex flex-col items-center justify-center relative transition-all border ${
                                                                isSelected ? 'bg-black border-black text-white' : 
                                                                isInterventionDay ? 'bg-white border-black/10 text-black font-bold' : 
                                                                'bg-[#F7F7F7] border-transparent text-neutral-400'
                                                            }`}
                                                        >
                                                            <span className="text-[14px]">{day}</span>
                                                            {isInterventionDay && !isSelected && (
                                                                <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-black/20" />
                                                            )}
                                                            {isToday && !isSelected && (
                                                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                <button
                                    onClick={() => setIsDateSelectorOpen(false)}
                                    className="w-full py-4 bg-[#F7F7F7] text-black font-bold rounded-[5px] mt-4"
                                >
                                    Annuler
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex flex-col gap-4 z-[10600]">
                <button
                    onClick={handleConfirm}
                    disabled={isSubmitting || interventions.length === 0}
                    className="w-full py-5 bg-[#2C2C2C] text-white rounded-[5px] font-bold text-[18px] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isSubmitting ? 'Confirmation...' : 'Confirmer le planning'}
                </button>
            </div>
        </motion.div>
    );
};

const Trophy = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
);

export default ScheduleInterventionView;
