"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, ChevronLeft, Home, Building, Building2, MapPin, 
    Wifi, Tv, Pocket as Kitchen, Wind as Ac, Waves as Pool, 
    Check, ChevronRight, Save, ShieldCheck 
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';

interface PropertySetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const STEPS = [
    { id: 'type', title: 'Quel type de logement?' },
    { id: 'specs', title: 'Quelques précisions' },
    { id: 'location', title: 'Où se situe-t-il?' },
    { id: 'automation', title: 'Paramètres d\'automatisation' }
];

const PROPERTY_TYPES = [
    { id: 'house', label: 'Maison', icon: Home },
    { id: 'apartment', label: 'Appartement', icon: Building },
    { id: 'villa', label: 'Villa', icon: Building2 },
];

const AMENITIES = [
    { id: 'wifi', label: 'Wifi', icon: Wifi },
    { id: 'tv', label: 'Télévision', icon: Tv },
    { id: 'kitchen', label: 'Cuisine', icon: Kitchen },
    { id: 'ac', label: 'Climatisation', icon: Ac },
    { id: 'pool', label: 'Piscine', icon: Pool },
];

const PropertySetupWizard: React.FC<PropertySetupWizardProps> = ({ isOpen, onClose, onComplete }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [stepIndex, setStepIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [type, setType] = useState('house');
    const [name, setName] = useState('');
    const [bedrooms, setBedrooms] = useState(1);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [address, setAddress] = useState('');
    const [preferredBricolerId, setPreferredBricolerId] = useState<string | null>(null);
    const [automationSettings, setAutomationSettings] = useState({
        autoCleanAfterCheckout: true,
        stockTracking: true,
        keyTransfer: true
    });

    const handleNext = () => {
        if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1);
        else onClose();
    };

    const handleSubmit = async () => {
        if (!auth.currentUser) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'properties'), {
                hostId: auth.currentUser.uid,
                name: name || `${type} à ${auth.currentUser.displayName}`,
                type,
                specs: {
                    bedrooms,
                    amenities: selectedAmenities,
                    address,
                    preferredBricolerId
                },
                automation: automationSettings,
                createdAt: serverTimestamp(),
                status: 'active'
            });
            showToast({
                variant: 'success',
                title: t({ en: 'Property listed!', fr: 'Propriété ajoutée !' })
            });
            onComplete();
        } catch (err) {
            console.error("Error creating property:", err);
            showToast({
                variant: 'error',
                title: t({ en: 'Error', fr: 'Erreur' }),
                description: 'Impossible d\'ajouter la propriété.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-neutral-100">
                <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-neutral-50 active:scale-90 transition-all">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1 flex justify-center gap-1">
                    {STEPS.map((_, idx) => (
                        <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === stepIndex ? 'w-8 bg-black' : 'w-2 bg-neutral-200'}`} />
                    ))}
                </div>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-neutral-50 active:scale-90 transition-all">
                    <X size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-10 no-scrollbar">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <h2 className="text-[28px] font-bold text-black leading-tight">{STEPS[stepIndex].title}</h2>

                        {stepIndex === 0 && (
                            <div className="space-y-4">
                                {PROPERTY_TYPES.map((pt) => {
                                    const Icon = pt.icon;
                                    const isActive = type === pt.id;
                                    return (
                                        <button
                                            key={pt.id}
                                            onClick={() => setType(pt.id)}
                                            className={`w-full flex items-center gap-4 p-6 rounded-[24px] border-2 transition-all ${isActive ? 'border-black bg-neutral-50 shadow-md scale-[1.02]' : 'border-neutral-100'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-400'}`}>
                                                <Icon size={24} />
                                            </div>
                                            <span className={`text-[18px] font-bold ${isActive ? 'text-black' : 'text-neutral-500'}`}>{pt.label}</span>
                                        </button>
                                    );
                                })}
                                <div className="pt-4">
                                    <label className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest pl-2">Nom de l'annonce</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Villa avec vue sur mer"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-neutral-50 border-none rounded-2xl p-5 mt-2 text-[16px] font-bold outline-none ring-2 ring-transparent focus:ring-black transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {stepIndex === 1 && (
                            <div className="space-y-10">
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-[18px] font-bold">Chambres</span>
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => setBedrooms(Math.max(1, bedrooms - 1))} className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center active:scale-90">-</button>
                                            <span className="text-[18px] font-bold w-4 text-center">{bedrooms}</span>
                                            <button onClick={() => setBedrooms(bedrooms + 1)} className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center active:scale-90">+</button>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[18px] font-bold mb-6 block">Équipements</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        {AMENITIES.map((am) => {
                                            const Icon = am.icon;
                                            const isSelected = selectedAmenities.includes(am.id);
                                            return (
                                                <button
                                                    key={am.id}
                                                    onClick={() => setSelectedAmenities(prev => isSelected ? prev.filter(i => i !== am.id) : [...prev, am.id])}
                                                    className={`p-6 rounded-[24px] border-2 flex flex-col gap-4 text-left transition-all ${isSelected ? 'border-black bg-neutral-50 shadow-sm' : 'border-neutral-100'}`}
                                                >
                                                    <Icon size={24} className={isSelected ? 'text-black' : 'text-neutral-400'} />
                                                    <span className={`text-[15px] font-bold ${isSelected ? 'text-black' : 'text-neutral-500'}`}>{am.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {stepIndex === 2 && (
                            <div className="space-y-6">
                                <div className="w-full aspect-video bg-neutral-100 rounded-[32px] flex flex-col items-center justify-center p-8 text-center border border-dashed border-neutral-300">
                                    <MapPin size={48} className="text-neutral-300 mb-4" />
                                    <p className="text-[14px] text-neutral-500 max-w-[200px]">L'intégration de la carte sera affichée ici.</p>
                                </div>
                                <div>
                                    <label className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest pl-2">Adresse de la propriété</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 12 Rue des Oliviers, Casablanca"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full bg-neutral-50 border-none rounded-2xl p-5 mt-2 text-[16px] font-bold outline-none ring-2 ring-transparent focus:ring-black transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {stepIndex === 3 && (
                            <div className="space-y-6">
                                {/* Preferred Bricoler Selection */}
                                <div className="mb-8">
                                    <h4 className="font-bold text-[18px] mb-4">Bricoleur de confiance (Optionnel)</h4>
                                    <div className="p-5 rounded-[28px] border-2 border-dashed border-neutral-200 flex items-center justify-between active:scale-[0.98] transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                                                <ShieldCheck size={20} className="text-neutral-400" />
                                            </div>
                                            <span className="text-[15px] font-medium text-neutral-500">Choisir un Bricoleur préféré</span>
                                        </div>
                                        <ChevronRight size={20} className="text-neutral-300" />
                                    </div>
                                    <p className="text-[12px] text-neutral-400 mt-2 px-2">Ce Bricoleur sera prioritaire pour toutes les missions automatiques.</p>
                                </div>

                                <div className="p-6 rounded-[32px] bg-neutral-50 border border-neutral-100 flex flex-col gap-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-[17px]">Nettoyage automatique</h4>
                                            <p className="text-[14px] text-neutral-500">Recrute un Bricoleur après chaque départ.</p>
                                        </div>
                                        <button 
                                            onClick={() => setAutomationSettings(prev => ({ ...prev, autoCleanAfterCheckout: !prev.autoCleanAfterCheckout }))}
                                            className={`w-14 h-8 rounded-full flex items-center px-1 transition-all ${automationSettings.autoCleanAfterCheckout ? 'bg-black' : 'bg-neutral-200'}`}
                                        >
                                            <motion.div animate={{ x: automationSettings.autoCleanAfterCheckout ? 24 : 0 }} className="w-6 h-6 bg-white rounded-full shadow-md" />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-[17px]">Suivi des stocks</h4>
                                            <p className="text-[14px] text-neutral-500">Alertes sur les consommables (savon, papier, etc.)</p>
                                        </div>
                                        <button 
                                            onClick={() => setAutomationSettings(prev => ({ ...prev, stockTracking: !prev.stockTracking }))}
                                            className={`w-14 h-8 rounded-full flex items-center px-1 transition-all ${automationSettings.stockTracking ? 'bg-black' : 'bg-neutral-200'}`}
                                        >
                                            <motion.div animate={{ x: automationSettings.stockTracking ? 24 : 0 }} className="w-6 h-6 bg-white rounded-full shadow-md" />
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-6 rounded-[28px] flex gap-4 border border-yellow-100">
                                    <ShieldCheck className="text-yellow-600 shrink-0" size={24} />
                                    <p className="text-[14px] text-yellow-800 leading-tight">Nos Bricoleurs sont formés aux standards de conciergerie Airbnb.</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-neutral-100 pb-10">
                <button 
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="w-full bg-black text-white py-5 rounded-2xl font-bold text-[17px] flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isSubmitting ? 'Publication...' : (stepIndex === STEPS.length - 1 ? 'Publier l\'annonce' : 'Continuer')}
                    {!isSubmitting && stepIndex < STEPS.length - 1 && <ChevronRight size={20} />}
                </button>
            </div>
        </div>
    );
};

export default PropertySetupWizard;
