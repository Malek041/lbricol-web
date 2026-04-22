"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Home, Building, MoreHorizontal, CheckCircle2, Search, Filter } from 'lucide-react';
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
            {/* Header - Ultra Clean Airbnb Style */}
            {!loading && properties.length > 0 && (
                <div className="px-6 pt-5 pb-2 flex justify-start items-center bg-white sticky top-0 z-20">
                    <h1 className="text-[34px] font-bold text-black leading-tight tracking-tight">
                        {t({ en: 'My Properties', fr: 'Mes Biens', ar: 'إعلاناتي' })}
                    </h1>
                </div>
            )}

            <div className="px-6 flex-1 flex flex-col items-center justify-center -mt-8">
                {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" /></div>
                ) : properties.length === 0 ? (
                    <div className="flex flex-col items-center text-center max-w-[400px] mx-auto">
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
                    <div className="space-y-6 w-full py-6">
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
