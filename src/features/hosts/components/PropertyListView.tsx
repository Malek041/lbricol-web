"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Home, Building, Rows, CheckCircle2, Search, Filter, LayoutGrid } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PropertySetupWizard from './PropertySetupWizard';
import PropertyDetailView from './PropertyDetailView';
import PostSetupPopupSequence from './PostSetupPopupSequence';
import Image from 'next/image';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
    TbBuildingEstate, TbBuildingCottage, TbBuildingMosque
} from 'react-icons/tb';
import {
    Warehouse, Bed, Ship, Tent, Truck, Castle, Hotel as HotelIcon
} from 'lucide-react';

const TYPE_MAP: Record<string, { label: { en: string, fr: string, ar?: string }, icon: any }> = {
    apartment: { label: { en: 'Apartment', fr: 'Appartement', ar: 'شقة' }, icon: Home },
    villa: { label: { en: 'Villa', fr: 'Villa', ar: 'فيلا' }, icon: TbBuildingEstate },
    guesthouse: { label: { en: 'Guesthouse', fr: 'Maison d\'hôtes', ar: 'دار ضيافة' }, icon: TbBuildingCottage },
    hotel: { label: { en: 'Hotel', fr: 'Hôtel', ar: 'فندق' }, icon: HotelIcon },
    riad: { label: { en: 'Riad', fr: 'Riad', ar: 'رياض' }, icon: TbBuildingMosque },
    barn: { label: { en: 'Barn', fr: 'Grange', ar: 'حظيرة' }, icon: Warehouse },
    bed_breakfast: { label: { en: 'B&B', fr: 'Chambre/B&B', ar: 'غرفة / فطور' }, icon: Bed },
    boat: { label: { en: 'Boat', fr: 'Bateau', ar: 'قارب' }, icon: Ship },
    cabin: { label: { en: 'Cabin', fr: 'Cabane', ar: 'كوخ' }, icon: Tent },
    camper: { label: { en: 'Camper', fr: 'Caravane', ar: 'مقطورة' }, icon: Truck },
    casa_particular: { label: { en: 'Casa particular', fr: 'Casa particular', ar: 'منزل خاص' }, icon: Castle },
};

const PropertyListView = () => {
    const { t } = useLanguage();
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState<any>(null);
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [newlyCreatedProperty, setNewlyCreatedProperty] = useState<any>(null);
    const [isPostSetupOpen, setIsPostSetupOpen] = useState(false);

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
                        <button
                            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                            className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100 active:scale-90 transition-all"
                        >
                            {viewMode === 'list' ? <LayoutGrid size={20} /> : <Rows size={20} />}
                        </button>
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100 active:scale-90 transition-all"
                        >
                            <Plus size={20} className="text-black" />
                        </button>
                    </div>
                    <h1 className="text-[32px] font-bold text-black tracking-tight">
                        {t({ en: 'My Listings', fr: 'Mes annonces', ar: 'إعلاناتي' })}
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
                            {viewMode === 'list' && (
                                <h2 className="text-[14px] font-bold text-[#2C2C2C] tracking-widest mb-4">
                                    {t({ en: 'Published', fr: 'Publiée', ar: 'منشور' })} ({properties.length})
                                </h2>
                            )}

                            <div className={viewMode === 'grid' ? "space-y-10" : "space-y-4"}>
                                {properties.map((property) => (
                                    <motion.div
                                        key={property.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={viewMode === 'grid' ? "flex flex-col gap-4 cursor-pointer" : "flex gap-4 p-0 group cursor-pointer"}
                                        onClick={() => setSelectedProperty(property)}
                                    >
                                        {viewMode === 'grid' ? (
                                            <>
                                                <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden bg-neutral-100 shadow-sm">
                                                    <Image
                                                        src={(property.photos && property.photos.length > 0) ? property.photos[0] : (property.coverPhoto || '/Images/placeholder-property.jpg')}
                                                        alt={property.name || 'Property'}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized={true}
                                                    />
                                                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full">
                                                        <div className="w-2 h-2 bg-[#4CAF50] rounded-full" />
                                                        <span className="text-[12px] font-bold text-black">Publiée</span>
                                                    </div>
                                                </div>
                                                <div className="px-2">
                                                    <h3 className="font-bold text-[20px] text-black tracking-tight mb-1">
                                                        {property.name || (property.type && `${property.type.charAt(0).toUpperCase() + property.type.slice(1)} à ${property.specs?.address?.split(',')[0]}`)}
                                                    </h3>
                                                    <p className="text-[15px] text-neutral-400 font-medium flex items-center gap-1.5">
                                                        {property.type && TYPE_MAP[property.type]?.icon && React.createElement(TYPE_MAP[property.type].icon, { size: 14, className: "shrink-0" })}
                                                        <span>
                                                            {property.type ? t(TYPE_MAP[property.type]?.label || { en: property.type, fr: property.type }) : t({ en: 'Property', fr: 'Logement' })} · {property.specs?.address?.split(',')[0] || 'Essaouira'}, Maroc
                                                        </span>
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-neutral-50">
                                                    <Image
                                                        src={(property.photos && property.photos.length > 0) ? property.photos[0] : (property.coverPhoto || '/Images/placeholder-property.jpg')}
                                                        alt={property.name || 'Property'}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized={true}
                                                    />
                                                    <div className="absolute top-1.5 left-1.5 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white shadow-sm" />
                                                </div>
                                                <div className="flex flex-col justify-center min-w-0 border-b border-neutral-50 flex-1 pb-4 group-last:border-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-[17px] text-black truncate tracking-tight pr-4">
                                                            {property.name || (property.type && `${property.type.charAt(0).toUpperCase() + property.type.slice(1)} à ${property.specs?.address?.split(',')[0]}`)}
                                                        </h3>
                                                    </div>
                                                    <p className="text-[14px] text-neutral-400 font-medium truncate mt-0.5 flex items-center gap-1.5">
                                                        {property.type && TYPE_MAP[property.type]?.icon && React.createElement(TYPE_MAP[property.type].icon, { size: 13, className: "shrink-0" })}
                                                        <span>
                                                            {property.type ? t(TYPE_MAP[property.type]?.label || { en: property.type, fr: property.type }) : t({ en: 'Property', fr: 'Logement' })} · {property.specs?.address?.split(',')[0] || 'Essaouira'}
                                                        </span>
                                                    </p>
                                                </div>
                                            </>
                                        )}
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
                onComplete={(property) => {
                    setIsWizardOpen(false);
                    if (property) {
                        setNewlyCreatedProperty(property);
                        setIsPostSetupOpen(true);
                    }
                }}
            />

            <PostSetupPopupSequence
                property={newlyCreatedProperty}
                isOpen={isPostSetupOpen}
                onComplete={() => {
                    setIsPostSetupOpen(false);
                    setNewlyCreatedProperty(null);
                }}
            />

            <PropertyDetailView
                property={selectedProperty}
                isOpen={!!selectedProperty}
                onClose={() => setSelectedProperty(null)}
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
