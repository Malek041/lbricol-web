"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, Home, Building, Building2, MapPin,
    Wifi, Tv, Pocket as Kitchen, Wind as Ac, Waves as Pool,
    Check, ChevronRight, Save, ShieldCheck, Warehouse, Coffee, Ship, Tent, Truck, Castle,
    Hotel as HotelIcon, Palmtree, Bed, Landmark, Search, Navigation
} from 'lucide-react';
import Lottie from 'lottie-react';
import homeAnimation from '../../../../public/Animated icons/system-regular-41-home-hover-pinch.json';
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
    { id: 'location', title: 'Où se situe-t-il?' },
    { id: 'specs', title: 'Quelques précisions' },
    { id: 'automation', title: 'Paramètres d\'automatisation' }
];

const PROPERTY_TYPES = [
    { id: 'house', label: { en: 'House', fr: 'Maison' }, icon: Home },
    { id: 'apartment', label: { en: 'Apartment', fr: 'Appartement' }, icon: Building },
    { id: 'guesthouse', label: { en: 'Guesthouse', fr: 'Maison d\'hôtes/Gîte rural' }, icon: Building2 },
    { id: 'hotel', label: { en: 'Hotel', fr: 'Hôtel' }, icon: HotelIcon },
    { id: 'riad', label: { en: 'Riad', fr: 'Riad' }, icon: Landmark },
    { id: 'barn', label: { en: 'Barn', fr: 'Grange' }, icon: Warehouse },
    { id: 'bed_breakfast', label: { en: 'Room/B&B', fr: 'Chambre/B&B' }, icon: Bed },
    { id: 'boat', label: { en: 'Boat', fr: 'Bateau' }, icon: Ship },
    { id: 'cabin', label: { en: 'Cabin', fr: 'Cabane' }, icon: Tent },
    { id: 'camper', label: { en: 'Camper', fr: 'Caravane ou camping-car' }, icon: Truck },
    { id: 'casa_particular', label: { en: 'Casa particular', fr: 'Casa particular' }, icon: Castle },
];

const AMENITIES = [
    { id: 'wifi', label: 'Wifi', icon: Wifi },
    { id: 'tv', label: 'Télévision', icon: Tv },
    { id: 'kitchen', label: 'Cuisine', icon: Kitchen },
    { id: 'ac', label: 'Climatisation', icon: Ac },
    { id: 'pool', label: 'Piscine', icon: Pool },
];

const INTRO_STEPS = [
    {
        num: 1,
        title: { en: 'Tell us about your property', fr: 'Parlez-nous de votre bien', ar: 'أخبرنا عن عقارك' },
        desc: {
            en: 'Tell us where it is, how many rooms it has, and what type of property it is.',
            fr: 'Dites-nous où il se trouve, combien de chambres il a et quel type de logement.',
            ar: 'أخبرنا عن موقعه وعدد غرفه ونوع العقار.'
        },
        img: '/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.17.png'
    },
    {
        num: 2,
        title: { en: 'Stand out', fr: 'Démarquez-vous', ar: 'تميّز عن الآخرين' },
        desc: {
            en: 'Add photos and a short description. We take care of the cleaning and restocking.',
            fr: 'Ajoutez des photos et une courte description. On s\'occupe du nettoyage et du réapprovisionnement.',
            ar: 'أضف صوراً ووصفاً مختصراً. نحن نتولى التنظيف وإعادة التموين.'
        },
        img: '/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.27.png'
    },
    {
        num: 3,
        title: { en: 'Publish & automate', fr: 'Publiez et automatisez', ar: 'انشر وأتمت' },
        desc: {
            en: 'Configure automatic cleaning, stock tracking, and publish your listing.',
            fr: 'Configurez le nettoyage automatique, le suivi des stocks, et publiez votre annonce.',
            ar: 'اضبط التنظيف التلقائي ومتابعة المخزون وانشر إعلانك.'
        },
        img: '/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.41.png'
    },
];

const PropertySetupWizard: React.FC<PropertySetupWizardProps> = ({ isOpen, onClose, onComplete }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<'intro_overview' | 'step1_detail' | 'form'>('intro_overview');
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

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Reset to intro every time the wizard is freshly opened
    useEffect(() => {
        if (isOpen) {
            setViewMode('intro_overview');
            setStepIndex(0);
        }
    }, [isOpen]);

    const handleBack = () => {
        if (viewMode === 'form') {
            if (stepIndex > 0) setStepIndex(stepIndex - 1);
            else setViewMode('step1_detail');
        } else if (viewMode === 'step1_detail') {
            setViewMode('intro_overview');
        } else {
            onClose();
        }
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

    // ── Mode: Intro Overview ───────────────────────────────────────────────
    if (viewMode === 'intro_overview') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[10000] bg-white flex flex-col font-plus-jakarta"
            >
                {/* Back arrow */}
                <div className="px-5 pt-5 pb-2">
                    <button
                        onClick={onClose}
                        className="p-2 -ml-1 rounded-full hover:bg-neutral-100 active:scale-90 transition-all"
                    >
                        <ChevronLeft size={26} className="text-black" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 overscroll-behavior-contain">
                    <h1 className="text-[34px] font-black text-black leading-[1.15] tracking-tight mb-8">
                        {t({
                            en: 'Getting started on Lbricol Host is easy',
                            fr: 'Commencer sur Lbricol Host, c\'est facile',
                            ar: 'البدء على Lbricol Host أمر سهل'
                        })}
                    </h1>

                    <div className="divide-y divide-neutral-100">
                        {INTRO_STEPS.map((step, i) => (
                            <motion.div
                                key={step.num}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.35 }}
                                className="flex items-start gap-4 py-5"
                            >
                                {/* Text */}
                                <div className="flex-1">
                                    <div className="flex items-start gap-3 mb-2">
                                        <span className="text-[17px] font-black text-black mt-0.5 shrink-0">{step.num}</span>
                                        <h2 className="text-[17px] font-black text-black leading-snug tracking-tight">
                                            {t(step.title)}
                                        </h2>
                                    </div>
                                    <p className="text-[14px] text-neutral-500 leading-relaxed pl-7">
                                        {t(step.desc)}
                                    </p>
                                </div>

                                {/* Image */}
                                <div className="relative w-[88px] h-[88px] shrink-0 rounded-2xl overflow-hidden">
                                    <Image
                                        src={step.img}
                                        alt={t(step.title)}
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Sticky green CTA */}
                <div className="px-6 pt-4 pb-5 border-t border-neutral-100 bg-white">
                    <button
                        onClick={() => setViewMode('step1_detail')}
                        className="w-full bg-[#01A084] text-white py-3.5 rounded-2xl font-bold text-[17px] active:scale-[0.98] transition-all "
                    >
                        {t({ en: 'Get started', fr: 'Commencer', ar: 'ابدأ الآن' })}
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Mode: Step 1 Detail ────────────────────────────────────────────────
    if (viewMode === 'step1_detail') {
        return (
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="fixed inset-0 z-[10000] bg-white flex flex-col font-plus-jakarta"
            >
                {/* Top Buttons Bar */}
                <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all"
                    >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all">
                            {t({ en: 'Questions?', fr: 'Des questions ?', ar: 'أسئلة؟' })}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32 overscroll-behavior-contain">
                    <motion.div
                        animate={{
                            y: [0, -12, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-[80%] aspect-square mb-12 rounded-[32px] overflow-hidden mx-auto"
                    >
                        <Image
                            src="/Images/PropertiesListingView/FirstStep/ChatGPT Image Apr 22, 2026, 10_39_44 PM-Photoroom.png"
                            alt="Step 1"
                            width={1000}
                            height={1000}
                            className="w-full h-full object-cover"
                            priority
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="space-y-4"
                    >
                        <span className="text-[18px] font-bold text-black">
                            {t({ en: 'Step 1', fr: 'Étape 1', ar: 'الخطوة 1' })}
                        </span>
                        <h2 className="text-[30px] font-black text-black leading-[1.1] tracking-tight">
                            {t({ en: 'Tell us about your property', fr: 'Parlez-nous de votre logement', ar: 'أخبرنا عن مسكنك' })}
                        </h2>
                        <p className="text-[17px] text-neutral-500 leading-relaxed font-medium">
                            {t({
                                en: 'In this step, we\'ll ask what type of property you have and basic details like location and capacity. This helps us automate cleaning and restocking perfectly.',
                                fr: 'Au cours de cette étape, nous allons vous demander quel type de logement vous proposez et des détails de base. Cela nous aide à automatiser parfaitement Les activités dont vous pourriez avoir besoin.',
                                ar: 'في هذه الخطوة، سنطلب منك نوع المسكن وتفاصيل أساسية. يساعدنا ذلك في أتمتة التنظيف وإعادة التموين بشكل مثالي.'
                            })}
                        </p>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex justify-between items-center z-20">
                    <button
                        onClick={handleBack}
                        className="text-[16px] font-bold text-black underline underline-offset-4 active:scale-95 transition-all"
                    >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <button
                        onClick={() => setViewMode('form')}
                        className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-bold active:scale-[0.98] transition-all"
                    >
                        {t({ en: 'Next', fr: 'Suivant', ar: 'التالي' })}
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col font-plus-jakarta">
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-neutral-100">
                <button
                    onClick={handleBack}
                    className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all"
                >
                    {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                </button>
                <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all">
                    {t({ en: 'Questions?', fr: 'Des questions ?' })}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-10 overscroll-behavior-contain">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        {stepIndex === 0 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h2 className="text-[26px] font-bold text-black leading-tight tracking-tight">
                                        {t({
                                            en: 'What type of place?',
                                            fr: 'Quel type de logement?'
                                        })}
                                    </h2>
                                    <p className="text-[15px] font-medium text-neutral-600 leading-snug">
                                        {t({
                                            en: 'From the following propositions, which one best describes your accommodation?',
                                            fr: 'Parmi les propositions suivantes, laquelle décrit le mieux votre logement ?'
                                        })}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {PROPERTY_TYPES.map((pt) => {
                                        const Icon = pt.icon;
                                        const isActive = type === pt.id;
                                        const isMaison = pt.id === 'house';

                                        return (
                                            <button
                                                key={pt.id}
                                                onClick={() => setType(pt.id)}
                                                className={`flex flex-col items-start justify-between p-4 rounded-xl border transition-all h-[120px] ${isActive ? 'border-black ring-1 ring-black bg-neutral-50' : 'border-neutral-200 hover:border-black'}`}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center">
                                                    {isMaison && isActive ? (
                                                        <Lottie
                                                            animationData={homeAnimation}
                                                            loop={false}
                                                            className="w-12 h-12 -mt-2 -ml-2"
                                                        />
                                                    ) : (
                                                        <Icon size={32} className="text-black" />
                                                    )}
                                                </div>
                                                <span className={`text-[15px] font-bold text-left leading-tight ${isActive ? 'text-black' : 'text-neutral-700'}`}>
                                                    {t(pt.label)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="pt-4">
                                    <label className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest pl-1 mb-2 block">Nom de l'annonce</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Villa avec vue sur mer"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white border border-neutral-300 rounded-xl p-4 text-[16px] font-medium outline-none focus:border-black transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {stepIndex === 1 && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h2 className="text-[32px] font-bold text-black leading-tight tracking-tight">
                                        {t({
                                            en: 'Where is your place located?',
                                            fr: 'Où est situé votre logement ?'
                                        })}
                                    </h2>
                                    <p className="text-[16px] font-medium text-neutral-500 leading-relaxed">
                                        {t({
                                            en: 'We will only communicate your address after the reservation. Until then, travelers will see an approximate location.',
                                            fr: 'Nous ne communiquerons votre adresse qu\'après la réservation. En attendant, les voyageurs verront un emplacement approximatif.'
                                        })}
                                    </p>
                                </div>

                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black">
                                        <Search size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={t({ en: 'Enter an address', fr: 'Saisir une adresse' })}
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        className="w-full bg-white border border-black rounded-full py-4 pl-12 pr-6 text-[16px] font-medium outline-none focus:border-black transition-all "
                                    />
                                </div>

                                <button className="flex items-center gap-4 group">
                                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-black group-active:scale-90 transition-all">
                                        <Navigation size={24} />
                                    </div>
                                    <span className="text-[17px] font-bold text-black">
                                        {t({ en: 'Use current location', fr: 'Utiliser ma position actuelle' })}
                                    </span>
                                </button>
                            </div>
                        )}

                        {stepIndex === 2 && (
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
            <div className="px-6 pt-2 pb-8 border-t border-neutral-100 flex flex-col gap-6">
                {/* Segmented Progress Bar */}
                <div className="flex gap-2 h-[4px] mt-2">
                    {STEPS.map((_, idx) => (
                        <div
                            key={idx}
                            className={`flex-1 rounded-full transition-all duration-500 ${idx <= stepIndex ? 'bg-black' : 'bg-neutral-200'}`}
                        />
                    ))}
                </div>

                <div className="flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="text-[16px] font-bold text-black underline underline-offset-4 active:scale-95 transition-all"
                    >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="bg-[#222222] text-white px-10 py-4 rounded-[12px] text-[16px] font-bold active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Publication...' : (stepIndex === STEPS.length - 1 ? 'Publier l\'annonce' : 'Suivant')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertySetupWizard;
