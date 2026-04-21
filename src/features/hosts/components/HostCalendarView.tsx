"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Home, X, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';

const HostCalendarView = () => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
    const [properties, setProperties] = useState<any[]>([]);
    const [isScheduling, setIsScheduling] = useState(false);
    const [selectedType, setSelectedType] = useState<'Check-in' | 'Check-out' | 'Cleaning'>('Cleaning');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'properties'), where('hostId', '==', auth.currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProperties(result);
        });
        return () => unsubscribe();
    }, [auth.currentUser]);

    const handleCreateIntervention = async () => {
        if (!auth.currentUser || !selectedPropertyId) return;
        
        setIsSubmitting(true);
        const property = properties.find(p => p.id === selectedPropertyId);
        
        try {
            await addDoc(collection(db, 'jobs'), {
                clientId: auth.currentUser.uid,
                propertyId: selectedPropertyId,
                status: 'new',
                service: 'cleaning',
                subService: selectedType,
                subServiceDisplayName: selectedType,
                address: property?.specs?.address || '',
                date: new Date().toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' }),
                time: "10:00",
                preferredBricolerId: property?.specs?.preferredBricolerId || null,
                createdAt: serverTimestamp(),
                isHostJob: true
            });

            showToast({
                variant: 'success',
                title: t({ en: 'Intervention scheduled!', fr: 'Intervention programmée !' })
            });
            setIsScheduling(false);
        } catch (err) {
            console.error("Error scheduling intervention:", err);
            showToast({
                variant: 'error',
                title: 'Erreur',
                description: 'Impossible de programmer l\'intervention.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };
 
    return (
        <div className="flex flex-col min-h-screen bg-white pb-32">
            {/* Header / Selector */}
            <div className="px-6 pt-16 pb-6 bg-white sticky top-0 z-20">
                <h1 className="text-[32px] font-bold text-black leading-none mb-6">Calendrier</h1>
                
                {/* Property Selector */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                    <button 
                        onClick={() => setSelectedPropertyId(null)}
                        className={`px-5 py-2.5 rounded-full border text-[14px] font-bold whitespace-nowrap transition-all ${!selectedPropertyId ? 'bg-black text-white border-black shadow-md' : 'bg-white text-neutral-500 border-neutral-200'}`}
                    >
                        Toutes les propriétés
                    </button>
                    {properties.map((p) => (
                        <button 
                            key={p.id}
                            onClick={() => setSelectedPropertyId(p.id)}
                            className={`px-5 py-2.5 rounded-full border text-[14px] font-bold whitespace-nowrap transition-all ${selectedPropertyId === p.id ? 'bg-black text-white border-black shadow-md' : 'bg-white text-neutral-500 border-neutral-200'}`}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Placeholder */}
            <div className="px-6 flex-1 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 flex items-center justify-center mb-4 border border-neutral-100">
                    <CalendarIcon size={32} className="text-neutral-300" />
                </div>
                <h3 className="text-[18px] font-bold mb-2">Gérez vos disponibilités</h3>
                <p className="text-neutral-500 text-[14px] leading-relaxed max-w-[240px]">
                    Sélectionnez une propriété pour voir son calendrier et programmer des interventions.
                </p>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-28 right-6 z-30">
                <button 
                    onClick={() => {
                        if (!selectedPropertyId && properties.length > 0) setSelectedPropertyId(properties[0].id);
                        setIsScheduling(true);
                    }}
                    className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                >
                    <Plus size={28} />
                </button>
            </div>

            {/* Scheduling Modal */}
            <AnimatePresence>
                {isScheduling && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-end justify-center"
                        onClick={() => setIsScheduling(false)}
                    >
                        <motion.div 
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-white w-full rounded-t-[42px] p-8 pb-12 shadow-2xl max-w-[500px]"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-[24px] font-bold">Programmer</h3>
                                <button onClick={() => setIsScheduling(false)} className="p-2 -mr-2 rounded-full bg-neutral-50"><X size={20} /></button>
                            </div>

                            <div className="space-y-6 mb-10">
                                <div>
                                    <label className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest block mb-3">Type d'intervention</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['Check-in', 'Check-out', 'Cleaning'] as const).map((type) => (
                                            <button 
                                                key={type}
                                                onClick={() => setSelectedType(type)}
                                                className={`py-4 rounded-2xl border-2 font-bold text-[14px] transition-all ${selectedType === type ? 'border-black bg-black text-white shadow-md' : 'border-neutral-100 text-neutral-500'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest block mb-3">Propriété</label>
                                    <div className="p-5 rounded-[24px] bg-neutral-50 border border-neutral-100 flex items-center gap-3">
                                        <Home size={20} className="text-black" />
                                        <span className="font-bold">{properties.find(p => p.id === selectedPropertyId)?.name || 'Sélectionnez une propriété'}</span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleCreateIntervention}
                                disabled={isSubmitting || !selectedPropertyId}
                                className="w-full bg-black text-white py-5 rounded-2xl font-bold text-[17px] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Programmation...' : 'Confirmer et Notifier les Bricoleurs'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HostCalendarView;
