"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Share, Heart, ChevronLeft, ChevronRight, Star, 
    Home, User, Shield, Info, MapPin, Wifi, Car, 
    Coffee, Tv, Wind, Globe, Languages, Sparkles,
    Trophy, Key, Maximize, Languages as TranslateIcon
} from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import MapView from '@/components/location-picker/MapView';

interface PropertyDetailViewProps {
    property: any;
    isOpen: boolean;
    onClose: () => void;
}

const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({ property, isOpen, onClose }) => {
    const { t } = useLanguage();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    if (!property) return null;

    const photos = property.photos || [];
    const name = property.name || 'Citycenter Blue Heaven avec vue panoramique + FIBRE';
    const type = property.type || 'apartment';
    const address = property.specs?.address || 'Essaouira, Maroc';
    const specs = property.specs || {};
    const guests = specs.guests || 3;
    const bedrooms = specs.bedrooms || 1;
    const beds = specs.beds || 1;
    const bathrooms = specs.bathrooms || 1;

    // Amenities mapping (mock for now based on pic 4)
    const amenities = [
        { icon: <Globe size={24} />, label: 'Vue panoramique sur la ville' },
        { icon: <Sparkles size={24} />, label: 'Vue sur le jardin' },
        { icon: <Coffee size={24} />, label: 'Cuisine' },
        { icon: <Wifi size={24} />, label: 'Wifi rapide (92 Mbit/s)' },
        { icon: <Maximize size={24} />, label: 'Espace de travail dédié' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[100] bg-white overflow-y-auto pb-24"
                >
                    {/* Header Controls Overlay */}
                    <div className="fixed top-0 left-0 right-0 z-[110] px-4 py-4 flex justify-between items-center pointer-events-none">
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center pointer-events-auto active:scale-90 transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="flex gap-2">
                            <button className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center pointer-events-auto active:scale-90 transition-all">
                                <Share size={20} />
                            </button>
                            <button className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center pointer-events-auto active:scale-90 transition-all">
                                <Heart size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Image Gallery */}
                    <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                        <Image
                            src={photos[currentImageIndex] || 'https://source.unsplash.com/800x600/?apartment,interior'}
                            alt={name}
                            fill
                            className="object-cover"
                        />
                        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-white text-[12px] font-medium">
                            {currentImageIndex + 1} / {photos.length || 31}
                        </div>
                    </div>

                    {/* Main Content Card - Airbnb Rounded Style */}
                    <div className="px-6 py-8 -mt-6 bg-white rounded-t-[32px] relative z-10 border-t border-neutral-100">
                        {/* Title Section */}
                        <div className="flex gap-3 mb-2">
                            <TranslateIcon size={24} className="shrink-0 mt-1" />
                            <h1 className="text-[26px] font-bold text-black leading-[1.2]">
                                {name}
                            </h1>
                        </div>

                        {/* Quick Stats */}
                        <div className="mt-4 space-y-1">
                            <p className="text-[16px] font-bold text-black">
                                {t({ en: 'Entire home: apartment', fr: 'Logement entier : appartement' })} - {address.split(',')[0]}, Maroc
                            </p>
                            <p className="text-[14px] text-neutral-500 font-medium">
                                {guests} voyageurs · {bedrooms} chambre · {beds} lit · {bathrooms} salle de bain
                            </p>
                        </div>

                        {/* Rating Summary Row */}
                        <div className="mt-8 flex items-center justify-between border border-neutral-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex flex-col items-center flex-1 border-r border-neutral-100">
                                <span className="text-[18px] font-bold">4,99</span>
                                <div className="flex gap-0.5 text-[8px]">
                                    {[1,2,3,4,5].map(i => <Star key={i} size={8} fill="black" />)}
                                </div>
                            </div>
                            <div className="flex flex-col items-center flex-1 px-2 text-center border-r border-neutral-100">
                                <div className="flex items-center gap-1">
                                    <Image src="/Images/PropertyDetails/laurels-left.png" width={16} height={16} alt="" />
                                    <span className="text-[12px] font-bold leading-tight">Coup de cœur<br/>voyageurs</span>
                                    <Image src="/Images/PropertyDetails/laurels-right.png" width={16} height={16} alt="" />
                                </div>
                            </div>
                            <div className="flex flex-col items-center flex-1">
                                <span className="text-[18px] font-bold">193</span>
                                <span className="text-[11px] text-neutral-500 font-medium">Commentaires</span>
                            </div>
                        </div>

                        {/* Host Section */}
                        <div className="mt-8 py-6 border-y border-neutral-100 flex items-center gap-4">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-100">
                                <Image src="https://i.pravatar.cc/150?u=othman" fill alt="Host" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#D70466] rounded-full border-2 border-white flex items-center justify-center">
                                    <Shield size={8} className="text-white" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[16px]">Hôte : Othman</span>
                                <span className="text-neutral-500 text-[14px]">Superhôte · Hôte depuis 2 ans</span>
                            </div>
                        </div>

                        {/* Highlights Section */}
                        <div className="mt-8 space-y-6">
                            <div className="flex gap-4">
                                <Trophy size={28} className="shrink-0 text-neutral-800" />
                                <div>
                                    <h4 className="font-bold text-[16px]">Ce logement fait partie des 1 % de logements préférés sur Airbnb</h4>
                                    <p className="text-neutral-500 text-[14px] leading-relaxed mt-1">
                                        Ce logement est l'un des mieux classés, d'après ses évaluations, ses commentaires et la fiabilité de l'annonce selon les voyageurs.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Key size={28} className="shrink-0 text-neutral-800" />
                                <div>
                                    <h4 className="font-bold text-[16px]">Procédure d'arrivée exceptionnelle</h4>
                                    <p className="text-neutral-500 text-[14px] leading-relaxed mt-1">
                                        Les voyageurs récents ont attribué 5 étoiles à la procédure d'arrivée.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Home size={28} className="shrink-0 text-neutral-800" />
                                <div>
                                    <h4 className="font-bold text-[16px]">Très spacieux</h4>
                                    <p className="text-neutral-500 text-[14px] leading-relaxed mt-1">
                                        Les voyageurs apprécient l'espace offert par ce logement, qui permet de passer un séjour confortable.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Automatic Translation Banner */}
                        <div className="mt-8 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                            <p className="text-[14px] text-neutral-600">
                                Certaines informations ont été traduites automatiquement. <span className="font-bold underline">Afficher le texte d'origine</span>
                            </p>
                        </div>

                        {/* Description */}
                        <div className="mt-10">
                            <p className="text-[16px] text-neutral-800 leading-relaxed line-clamp-6">
                                {property.description || "Savourez le luxe de notre appartement moderne, qui allie tranquillité, lumière naturelle et commodités essentielles. Plongez dans l'élégance avec un mobilier raffiné, des équipements de pointe et une ambiance sereine. Besoin de détente ? Les détails emblématiques de notre appartement, du canapé et du lit confortables, ainsi qu'un espace de travail captivant avec vue panoramique à 180° sur la ville. ..."}
                            </p>
                            <button className="mt-4 flex items-center gap-1 font-bold underline text-[16px]">
                                Lire la suite <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Where You'll Sleep Section */}
                        <div className="mt-12">
                            <h2 className="text-[22px] font-bold mb-6">Où vous dormirez</h2>
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                <div className="min-w-[200px] flex-shrink-0">
                                    <div className="aspect-[4/3] rounded-xl overflow-hidden relative mb-3 bg-neutral-100">
                                        <Image src={photos[1] || 'https://source.unsplash.com/800x600/?bedroom'} fill className="object-cover" alt="" />
                                    </div>
                                    <h4 className="font-bold text-[16px]">Chambre</h4>
                                    <p className="text-[14px] text-neutral-500">1 lit queen size</p>
                                </div>
                                <div className="min-w-[200px] flex-shrink-0">
                                    <div className="aspect-[4/3] rounded-xl overflow-hidden relative mb-3 bg-neutral-100">
                                        <Image src={photos[2] || 'https://source.unsplash.com/800x600/?livingroom'} fill className="object-cover" alt="" />
                                    </div>
                                    <h4 className="font-bold text-[16px]">Salon</h4>
                                    <p className="text-[14px] text-neutral-500">1 canapé</p>
                                </div>
                            </div>
                        </div>

                        {/* Amenities Section */}
                        <div className="mt-12 pt-12 border-t border-neutral-100">
                            <h2 className="text-[22px] font-bold mb-6">Ce que propose ce logement</h2>
                            <div className="space-y-4">
                                {amenities.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 text-neutral-800">
                                        {item.icon}
                                        <span className="text-[16px]">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="mt-8 w-full py-3.5 border border-black rounded-lg font-bold text-[16px] active:scale-[0.98] transition-all">
                                Afficher les 58 équipements
                            </button>
                        </div>

                        {/* Location Section */}
                        <div className="mt-12 pt-12 border-t border-neutral-100">
                            <h2 className="text-[22px] font-bold mb-6">Où se situe le logement</h2>
                            <div className="h-[240px] rounded-2xl overflow-hidden relative border border-neutral-100 shadow-sm">
                                <MapView
                                    onLocationChange={() => {}}
                                    initialLocation={property.location || { lat: 31.5085, lng: -9.7595 }}
                                    interactive={false}
                                    zoom={15}
                                    clientPin={property.location || { lat: 31.5085, lng: -9.7595 }}
                                />
                            </div>
                            <div className="mt-6">
                                <h4 className="font-bold text-[16px]">{address}</h4>
                                <p className="mt-3 text-neutral-500 text-[14px] leading-relaxed">
                                    L'appartement est situé dans un quartier au cœur du centre-ville d'Essaouira, à deux pas de la médina et à seulement 10 minutes à pied de la plage...
                                </p>
                                <button className="mt-4 flex items-center gap-1 font-bold underline text-[16px]">
                                    Lire la suite <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Action Footer */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-6 py-4 flex justify-between items-center z-[115]">
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                                <span className="text-neutral-400 line-through text-[14px]">MAD 4033</span>
                                <span className="text-[16px] font-bold">MAD 3 683</span>
                                <span className="text-neutral-500 text-[14px]">pour 5 nuits</span>
                            </div>
                            <span className="text-[12px] font-medium underline">20-25 mai</span>
                        </div>
                        <button className="px-8 py-3.5 bg-[#D70466] text-white rounded-lg font-bold text-[16px] active:scale-[0.96] transition-all">
                            Réserver
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PropertyDetailView;
