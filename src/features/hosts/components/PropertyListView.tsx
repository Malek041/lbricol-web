"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Home, Building, MoreHorizontal, CheckCircle2, Search, Filter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PropertySetupWizard from './PropertySetupWizard';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const PropertyListView = () => {
    const { t } = useLanguage();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'properties'), where('hostId', '==', auth.currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setProperties(result);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [auth.currentUser]);

    return (
        <div className="flex flex-col min-h-screen bg-white pb-32">
            {/* Header */}
            <div className="px-6 pt-16 pb-6 flex justify-between items-center bg-white sticky top-0 z-20">
                <h1 className="text-[32px] font-bold text-black leading-none">Annonces</h1>
                <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F7F7F7] active:scale-90 transition-all">
                        <Search size={18} className="text-neutral-600" />
                    </button>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="w-10 h-10 rounded-full  flex items-center justify-center bg-[#F7F7F7] active:scale-90 transition-all"
                    >
                        <Plus size={20} className="text-neutral-600" />
                    </button>
                </div>
            </div>

            <div className="px-6">
                {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>
                ) : properties.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center px-10">
                        <div className="w-24 h-24 rounded-full bg-neutral-50 flex items-center justify-center mb-8 ">
                            <Building size={78} className="text-black" />
                        </div>
                        <h3 className="text-[22px] font-bold mb-3 tracking-tight">Créez votre première Listing</h3>
                        <p className="text-neutral-500 text-[15px] leading-relaxed mb-10 max-w-[280px]">
                            List your property to start automating your check-ins, check-outs, and cleanings with our Bricoleurs.
                        </p>
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="w-full bg-[#01A083] text-white py-3 rounded-full font-bold text-[17px]  active:scale-[0.98] transition-all"
                        >
                            Débutez maintenant
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {properties.map((property) => (
                            <motion.div
                                key={property.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-neutral-100 rounded-[32px] overflow-hidden shadow-sm"
                            >
                                <div className="aspect-[4/3] bg-neutral-100 relative">
                                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[12px] font-bold shadow-sm">
                                        {property.type === 'house' ? 'Maison' : property.type === 'apartment' ? 'Appartement' : 'Villa'}
                                    </div>
                                    <img src={`https://source.unsplash.com/800x600/?${property.type},home`} className="w-full h-full object-cover" />
                                </div>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-[18px] font-bold text-black">{property.name}</h3>
                                        <button className="p-2 -mr-2 rounded-full hover:bg-neutral-50"><MoreHorizontal size={20} /></button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[14px] text-neutral-500">
                                        <span>{property.specs?.bedrooms || 0} chambres</span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1 text-green-600 font-bold">
                                            <CheckCircle2 size={14} />
                                            <span>Prêt</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Filter Button (Airbnb Style) */}
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30">
                <button className="bg-black text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl active:scale-95 transition-all text-[14px] font-bold">
                    <Filter size={16} fill="white" />
                    Filtres
                </button>
            </div>
            <PropertySetupWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onComplete={() => {
                    setIsWizardOpen(false);
                    // Refresh properties logic here
                }}
            />
        </div>
    );
};

export default PropertyListView;
