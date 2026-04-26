"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Home, Building, MoreHorizontal, CheckCircle2, Search, Filter, LayoutGrid } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PropertySetupWizard from './PropertySetupWizard';
import Image from 'next/image';
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
            {/* Header - Lbricol Host Style */}
            {!loading && properties.length > 0 && (
                <div className="px-6 pt-8 pb-4 flex flex-col bg-white sticky top-0 z-20">
                    <div className="flex justify-end items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                            <Search size={20} className="text-black" />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                            <LayoutGrid size={20} className="text-black" />
                        </div>
                        <button 
                            onClick={() => setIsWizardOpen(true)}
                            className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100 active:scale-90 transition-all"
                        >
                            <Plus size={20} className="text-black" />
                        </button>
                    </div>
                    <h1 className="text-[32px] font-bold text-black tracking-tight">
                        {t({ en: 'Listings', fr: 'Mon annonce', ar: 'إعلاناتي' })}
                    </h1>
                </div>
            )}

            <div className="px-6 flex-1 flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center -mt-20">
                        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : properties.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-[400px] mx-auto -mt-20">
                        {/* Hero Image - Smaller as requested */}
                        <div className="w-[70%] relative mb-8 opacity-100 aspect-square">
                            <Image
                                src="/Images/Screenshot 2026-04-22 at 18.18.29.png"
                                alt="Journey"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>

                        {/* Heading - Translated */}
                        <h2 className="text-[22px] font-bold text-black mb-4 px-2 leading-[1.2] tracking-tight">
                            {t({
                                en: 'Your growth starts now',
                                fr: 'Votre croissance commence maintenant',
                                ar: 'رحلتك نحو مزيد من النمو تبدأ الآن'
                            })}
                        </h2>

                        {/* Body - Translated */}
                        <p className="text-neutral-500 text-[15px] leading-[1.5] mb-10 px-2">
                            {t({
                                en: 'List your properties. The app automate cleaning, restocking, and more for you. You focus on scheduling.',
                                fr: 'Listez vos propriétés. L\'app gère tout. Vous planifiez les arrivées et départs.',
                                ar: 'أدرج جميع عقاراتك هنا واترك لبريكول يتولى الباقي. نحن ندير تلقائياً كل شيء من التنظيف إلى إعادة التموين.'
                            })}
                        </p>

                        {/* Button - Translated */}
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="px-10 py-3.5 bg-[#01A084] text-white rounded-lg font-bold text-[16px] active:scale-[0.96] transition-all shadow-md hover:bg-[#D70466]"
                        >
                            {t({ en: 'Commencer', fr: 'Commencer', ar: 'ابدأ الآن' })}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 w-full py-2">
                        <div>
                            <h2 className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                                {t({ en: 'Published', fr: 'Publiée', ar: 'منشور' })} ({properties.length})
                            </h2>

                            <div className="space-y-4">
                                {properties.map((property) => (
                                    <motion.div
                                        key={property.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-4 p-0 group cursor-pointer"
                                    >
                                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-neutral-100">
                                            <img 
                                                src={property.photos?.[0] || `https://source.unsplash.com/400x400/?${property.type},home`} 
                                                className="w-full h-full object-cover" 
                                            />
                                            <div className="absolute top-1.5 left-1.5 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white shadow-sm" />
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0 border-b border-neutral-50 flex-1 pb-4 group-last:border-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-[17px] text-black truncate tracking-tight pr-4">
                                                    {property.name || 'Dar Lehbib | Self Check-In | Plage'}
                                                </h3>
                                            </div>
                                            <p className="text-[14px] text-neutral-400 font-medium truncate mt-0.5">
                                                {t({ en: 'Property', fr: 'Logement' })} · {property.specs?.address?.split(',')[0] || 'Essaouira'}, Marrakesh-Safi
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <PropertySetupWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onComplete={() => {
                    setIsWizardOpen(false);
                    // Refresh properties logic here
                }}
            />
            {/* Preload Wizard Images */}
            <div className="sr-only" aria-hidden="true">
                <Image src="/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.17.png" alt="" width={1} height={1} priority />
                <Image src="/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.27.png" alt="" width={1} height={1} priority />
                <Image src="/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.41.png" alt="" width={1} height={1} priority />
                <Image src="/Images/PropertiesListingView/FirstStep/ChatGPT Image Apr 22, 2026, 10_39_44 PM.png" alt="" width={1} height={1} priority />
            </div>
        </div>
    );
};

export default PropertyListView;
