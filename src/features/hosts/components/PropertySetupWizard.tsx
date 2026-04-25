"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, Home, Building, Building2, MapPin,
    Wifi, Tv, Pocket as Kitchen, Wind as Ac, Waves as Pool, Wind, Waves,
    Check, ChevronRight, Save, ShieldCheck, Warehouse, Coffee, Ship, Tent, Truck, Castle,
    Hotel as HotelIcon, Palmtree, Bed, Landmark, Search, Navigation,
    WashingMachine, Car, ParkingCircle, Monitor, Bath, Fence, Flame, Utensils, Dices,
    Music, Dumbbell, Mountain, ShowerHead, SquarePlus, Snowflake,
    TreePine, PawPrint, Baby, Camera, Plus, Trash2,
    Sparkles, Key, Shirt, Wrench, Package, MonitorUp, Droplets, Zap, Paintbrush, Heart, ChefHat, Map, BookOpen, Hammer, Plane, BellRing
} from 'lucide-react';
import Lottie from 'lottie-react';
import homeAnimation from '../../../../public/Animated icons/system-regular-41-home-hover-pinch.json';
import LocationPicker from '@/components/location-picker/LocationPicker';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/context/ToastContext';
import { uploadToCloudinary } from '@/lib/upload';

interface PropertySetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

import { SERVICES_CATALOGUE } from '@/config/services_catalogue';

const SERVICE_ICONS: Record<string, any> = {
    home_repairs: Wrench,
    furniture_assembly: Hammer,
    mounting: MonitorUp,
    moving: Truck,
    cleaning: Sparkles,
    glass_cleaning: Droplets,
    gardening: TreePine,
    plumbing: Wrench,
    electricity: Zap,
    painting: Paintbrush,
    babysitting: Baby,
    pool_cleaning: Waves,
    pets_care: PawPrint,
    errands: Package,
    elderly_care: Heart,
    cooking: ChefHat,
    tour_guide: Map,
    private_driver: Car,
    learn_arabic: BookOpen,
    car_rental: Key,
    airport_pickup: Plane,
    guest_receptionist: BellRing,
};

const STEPS = [
    { id: 'type', title: 'Quel type de logement?' },
    { id: 'location', title: 'Où se situe-t-il?' },
    { id: 'specs', title: 'Quelques précisions' },
    { id: 'amenities', title: 'Équipements' },
    { id: 'photos', title: 'Photos' },
    { id: 'automation', title: 'Paramètres d\'automatisation' },
    { id: 'guest_services', title: 'Services pour les voyageurs' },
    { id: 'future_services', title: 'Services futurs' }
];

const AUTOMATED_SERVICE_IDS = ['cleaning', 'gardening', 'glass_cleaning', 'pool_cleaning', 'errands', 'pets_care', 'guest_receptionist'];

const AMENITY_GROUPS = [
    {
        id: 'standout',
        title: { en: 'Do you have any standout amenities?', fr: 'Possédez-vous des équipements hors du commun ?' },
        items: [
            { id: 'garden', label: { en: 'Garden', fr: 'Jardin' }, icon: TreePine },
            { id: 'pool', label: { en: 'Pool', fr: 'Piscine' }, icon: Waves },
            { id: 'pets_place', label: { en: 'Place for pets', fr: 'Espace pour animaux' }, icon: PawPrint },
            { id: 'kids_space', label: { en: 'Kids space', fr: 'Espace enfants' }, icon: Baby },
            { id: 'hottub', label: { en: 'Hot tub', fr: 'Jacuzzi' }, icon: Bath },
            { id: 'patio', label: { en: 'Patio', fr: 'Patio' }, icon: Fence },
            { id: 'bbq', label: { en: 'BBQ grill', fr: 'Barbecue' }, icon: Flame },
            { id: 'outdoor_dining', label: { en: 'Outdoor dining area', fr: 'Espace repas en plein air' }, icon: Utensils },
            { id: 'fire_pit', label: { en: 'Fire pit', fr: 'Brasero' }, icon: Flame },
            { id: 'pool_table', label: { en: 'Pool table', fr: 'Billard' }, icon: Dices },
            { id: 'fireplace', label: { en: 'Indoor fireplace', fr: 'Cheminée' }, icon: Flame },
            { id: 'piano', label: { en: 'Piano', fr: 'Piano' }, icon: Music },
            { id: 'gym', label: { en: 'Exercise equipment', fr: 'Appareils de fitness' }, icon: Dumbbell },
            { id: 'lake_access', label: { en: 'Lake access', fr: 'Accès au lac' }, icon: Waves },
            { id: 'beach_access', label: { en: 'Beach access', fr: 'Accès à la plage' }, icon: Palmtree },
            { id: 'ski_in_out', label: { en: 'Ski-in/ski-out', fr: 'Au pied des pistes' }, icon: Mountain },
            { id: 'outdoor_shower', label: { en: 'Outdoor shower', fr: 'Douche extérieure' }, icon: ShowerHead },
        ]
    },
    {
        id: 'favorite',
        title: { en: 'What about these favorite amenities?', fr: 'Qu\'en est-il de ces équipements préférés des voyageurs ?' },
        subtitle: { en: 'You can add amenities once your listing is published.', fr: 'Vous pourrez ajouter des équipements une fois votre annonce publiée.' },
        items: [
            { id: 'wifi', label: { en: 'Wifi', fr: 'Wifi' }, icon: Wifi },
            { id: 'tv', label: { en: 'TV', fr: 'Télévision' }, icon: Tv },
            { id: 'kitchen', label: { en: 'Kitchen', fr: 'Cuisine' }, icon: Kitchen },
            { id: 'washer', label: { en: 'Washer', fr: 'Lave-linge' }, icon: WashingMachine },
            { id: 'free_parking', label: { en: 'Free parking on premises', fr: 'Stationnement gratuit sur place' }, icon: Car },
            { id: 'paid_parking', label: { en: 'Paid parking on premises', fr: 'Stationnement payant sur place' }, icon: ParkingCircle },
            { id: 'ac', label: { en: 'Air conditioning', fr: 'Climatisation' }, icon: Snowflake },
            { id: 'workspace', label: { en: 'Dedicated workspace', fr: 'Espace de travail dédié' }, icon: Monitor },
        ]
    },
    {
        id: 'safety',
        title: { en: 'Do you have these safety items?', fr: 'Possédez-vous ces équipements de sécurité ?' },
        items: [
            { id: 'smoke_alarm', label: { en: 'Smoke alarm', fr: 'Détecteur de fumée' }, icon: Wind },
            { id: 'first_aid_kit', label: { en: 'First aid kit', fr: 'Trousse de premiers secours' }, icon: SquarePlus },
            { id: 'fire_extinguisher', label: { en: 'Fire extinguisher', fr: 'Extincteur' }, icon: Flame },
            { id: 'carbon_monoxide_alarm', label: { en: 'Carbon monoxide alarm', fr: 'Détecteur de monoxyde de carbone' }, icon: Wind },
        ]
    }
];

const PROPERTY_TYPES = [
    { id: 'apartment', label: { en: 'Apartment', fr: 'Appartement' }, icon: Home },
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
        title: { en: 'Automate & Publish', fr: 'Automatisez et Publiez', ar: 'انشر وأتمت' },
        desc: {
            en: 'Configure automatic cleaning, stock tracking, and publish your listing.',
            fr: 'Configurez le nettoyage automatique, le suivi des stocks, et publiez votre annonce.',
            ar: 'اضبط التنظيف التلقائي \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0648\u0627\u0646\u0634\u0631 \u0625\u0639\u0644\u0627\u0646\u0643.',
        },
        img: '/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.41.png'
    },
];

const CounterRow = ({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (val: number) => void; min?: number }) => (
    <div className="flex justify-between items-center py-6">
        <span className="text-[18px] font-medium text-black">{label}</span>
        <div className="flex items-center gap-4">
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
                className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 text-black"
            >
                <div className="w-3 h-[1.5px] bg-black opacity-60" />
            </button>
            <span className="text-[17px] font-light w-6 text-center text-black tabular-nums">{value}</span>
            <button
                onClick={() => onChange(value + 1)}
                className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center active:scale-90 transition-all text-black"
            >
                <div className="relative w-3 h-3 flex items-center justify-center">
                    <div className="absolute w-3 h-[1.5px] bg-black opacity-80" />
                    <div className="absolute w-[1.5px] h-3 bg-black opacity-80" />
                </div>
            </button>
        </div>
    </div>
);

const Typewriter = ({ text }: { text: string }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 15);
        return () => clearInterval(interval);
    }, [text]);

    return <span>{displayedText}</span>;
};



const PropertySetupWizard: React.FC<PropertySetupWizardProps> = ({ isOpen, onClose, onComplete }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<'intro_overview' | 'step1_detail' | 'step2_detail' | 'step3_detail' | 'form' | 'service_detail_form'>('intro_overview');
    const [stepIndex, setStepIndex] = useState(0);
    const [currentDetailServiceId, setCurrentDetailServiceId] = useState<string | null>(null);

    // Cleaning Details State
    const [cleaningSubServices, setCleaningSubServices] = useState<string[]>([]);
    const [cleaningFrequencies, setCleaningFrequencies] = useState<Record<string, string>>({});
    const [cleaningChecklist, setCleaningChecklist] = useState<string[]>(['']);
    const [cleaningPhotos, setCleaningPhotos] = useState<string[]>([]);
    const [isUploadingCleaningPhotos, setIsUploadingCleaningPhotos] = useState(false);
    const cleaningPhotoInputRef = useRef<HTMLInputElement>(null);
    const [activeServiceInfo, setActiveServiceInfo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCleaningPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const tempUrls = files.map(file => URL.createObjectURL(file));
        setCleaningPhotos(prev => [...prev, ...tempUrls]);
        setIsUploadingCleaningPhotos(true);

        try {
            await Promise.all(files.map(async (file, index) => {
                const tempUrl = tempUrls[index];
                return new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const cloudinaryUrl = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/${auth.currentUser?.uid}/cleaning`,
                                'lbricol_portfolio'
                            );
                            setCleaningPhotos(current => current.map(p => p === tempUrl ? cloudinaryUrl : p));
                            URL.revokeObjectURL(tempUrl);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }));
        } catch (error) {
            console.error('Failed to upload cleaning reference photos:', error);
        } finally {
            setIsUploadingCleaningPhotos(false);
            if (e.target) e.target.value = '';
        }
    };

    // Form State
    const [type, setType] = useState('apartment');
    const [name, setName] = useState('');
    const [guests, setGuests] = useState(4);
    const [bedrooms, setBedrooms] = useState(1);
    const [beds, setBeds] = useState(1);
    const [bathrooms, setBathrooms] = useState(1);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [address, setAddress] = useState('');
    const [baseLat, setBaseLat] = useState<number | null>(null);
    const [baseLng, setBaseLng] = useState<number | null>(null);
    const [floor, setFloor] = useState<number>(0);
    const [apartmentNumber, setApartmentNumber] = useState('');
    const [photos, setPhotos] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showPhotoAdvice, setShowPhotoAdvice] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const dragIndexRef = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [preferredBricolerId, setPreferredBricolerId] = useState<string | null>(null);
    const [automationSettings, setAutomationSettings] = useState({
        autoCleanAfterCheckout: true,
        stockTracking: true,
        keyTransfer: true
    });
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [activeServiceCategory, setActiveServiceCategory] = useState<string>(SERVICES_CATALOGUE[0].id);

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        // Optimistically show photos instantly using local object URLs
        const tempUrls = files.map(file => URL.createObjectURL(file));

        setPhotos(prev => {
            const newPhotos = [...prev, ...tempUrls];
            if (prev.length === 0 && tempUrls.length > 0) {
                setShowPhotoAdvice(true);
            }
            return newPhotos;
        });

        setIsUploading(true);
        try {
            await Promise.all(files.map(async (file, index) => {
                const tempUrl = tempUrls[index];

                return new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const cloudinaryUrl = await uploadToCloudinary(reader.result as string, `lbricol/properties/${auth.currentUser?.uid}`, 'lbricol_portfolio');

                            // Replace temporary local URL with actual Cloudinary URL
                            setPhotos(currentPhotos =>
                                currentPhotos.map(photo => photo === tempUrl ? cloudinaryUrl : photo)
                            );

                            // Cleanup the blob URL
                            URL.revokeObjectURL(tempUrl);
                            resolve();
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }));
        } catch (error) {
            console.error('Failed to upload photos:', error);
        } finally {
            setIsUploading(false);
            if (e.target) {
                e.target.value = '';
            }
        }
    };

    const deletePhoto = (idx: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== idx));
    };

    const handleDragStart = (idx: number) => {
        dragIndexRef.current = idx;
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIndex(idx);
    };

    const handleDrop = (idx: number) => {
        const from = dragIndexRef.current;
        if (from === null || from === idx) {
            dragIndexRef.current = null;
            setDragOverIndex(null);
            return;
        }
        setPhotos(prev => {
            const updated = [...prev];
            const [moved] = updated.splice(from, 1);
            updated.splice(idx, 0, moved);
            return updated;
        });
        dragIndexRef.current = null;
        setDragOverIndex(null);
    };

    const handleNext = () => {
        if (viewMode === 'form') {
            if (stepIndex === 2) {
                setViewMode('step2_detail');
                return;
            }
            if (stepIndex === 4) {
                setViewMode('step3_detail');
                return;
            }
            if (stepIndex === STEPS.length - 1) {
                const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
                if (selectedAutomationServices.length > 0) {
                    setViewMode('service_detail_form');
                    setCurrentDetailServiceId(selectedAutomationServices[0]);
                    return;
                }
            }
        }

        if (viewMode === 'service_detail_form') {
            const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
            const currentIndex = selectedAutomationServices.indexOf(currentDetailServiceId!);

            if (currentIndex < selectedAutomationServices.length - 1) {
                setCurrentDetailServiceId(selectedAutomationServices[currentIndex + 1]);
                return;
            } else {
                handleSubmit();
                return;
            }
        }

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
            setActiveServiceInfo(null);
        }
    }, [isOpen]);

    useEffect(() => {
        setActiveServiceInfo(null);
    }, [stepIndex]);

    const handleBack = () => {
        if (viewMode === 'form') {
            if (stepIndex === 3) { // Back from Amenities
                setViewMode('step2_detail');
                return;
            }
            if (stepIndex === 5) { // Back from Automation
                setViewMode('step3_detail');
                return;
            }
            if (stepIndex > 0) {
                setStepIndex(stepIndex - 1);
            } else {
                setViewMode('step1_detail');
            }
        } else if (viewMode === 'service_detail_form') {
            const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
            const currentIndex = selectedAutomationServices.indexOf(currentDetailServiceId!);

            if (currentIndex > 0) {
                setCurrentDetailServiceId(selectedAutomationServices[currentIndex - 1]);
            } else {
                setViewMode('form');
                setStepIndex(STEPS.length - 1);
            }
        } else if (viewMode === 'step2_detail') {
            setViewMode('form');
            setStepIndex(2);
        } else if (viewMode === 'step3_detail') {
            setViewMode('form');
            setStepIndex(4);
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
                    floor,
                    guests,
                    beds,
                    bathrooms,
                    apartmentNumber,
                    amenities: selectedAmenities,
                    address,
                    lat: baseLat,
                    lng: baseLng,
                    preferredBricolerId
                },
                automation: {
                    ...automationSettings,
                    services: selectedServices,
                    cleaningDetails: selectedServices.includes('cleaning') ? {
                        subServices: cleaningSubServices,
                        frequencies: cleaningFrequencies,
                        checklist: cleaningChecklist.filter(item => item.trim() !== ''),
                        referencePhotos: cleaningPhotos
                    } : null
                },
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
                        <div className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black cursor-default">
                            {t({ en: 'Questions?', fr: 'Des questions ?', ar: 'أسئلة؟' })}
                        </div>
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
                        <span className="text-[18px] font-medium text-black">
                            {t({ en: 'Step 1', fr: 'Étape 1', ar: 'الخطوة 1' })}
                        </span>
                        <h2 className="text-[30px] font-black text-black leading-[1.1] tracking-tight">
                            {t({ en: 'Tell us about your property', fr: 'Parlez-nous de votre logement', ar: 'أخبرنا عن مسكنك' })}
                        </h2>
                        <p className="text-[17px] text-[#2C2C2C] leading-relaxed font-medium">
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
                        {t({ en: 'Back', fr: 'Retour' })}
                    </button>
                    <button
                        onClick={() => setViewMode('form')}
                        className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-bold active:scale-[0.98] transition-all"
                    >
                        {t({ en: 'Next', fr: 'Suivant' })}
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Mode: Step 2 Detail ────────────────────────────────────────────────
    if (viewMode === 'step2_detail') {
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
                        <div className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black cursor-default">
                            {t({ en: 'Questions?', fr: 'Des questions ?', ar: 'أسئلة؟' })}
                        </div>
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
                        className="w-[60%] aspect-square mb-12 rounded-[32px] overflow-hidden mx-auto"
                    >
                        <Image
                            src="/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.27.png"
                            alt="Step 2"
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
                        <span className="text-[18px] font-medium text-black">
                            {t({ en: 'Step 2', fr: 'Étape 2', ar: 'الخطوة 2' })}
                        </span>
                        <h2 className="text-[30px] font-black text-black leading-[1.1] tracking-tight">
                            {t({
                                en: 'Make your listing stand out',
                                fr: 'Faites sortir votre annonce du lot',
                                ar: 'اجعل إعلانك متميزاً'
                            })}
                        </h2>
                        <p className="text-[17px] text-neutral-500 leading-relaxed font-medium">
                            {t({
                                en: 'In this step, you can add some of the amenities offered in your accommodation and at least 5 photos. You can then add a title and a description.',
                                fr: 'À cette étape, vous pouvez ajouter certains des espaces et équipements proposés dans votre hébergement, ainsi qu\'au moins 5 photos. Vous pouvez ensuite ajouter un titre et une description.',
                                ar: 'في هذه الخطوة، يمكنك إضافة بعض المرافق المتوفرة في مسكنك و 5 صور على الأقل. يمكنك بعد ذلك إضافة عنوان ووصف.'
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
                        {t({ en: 'Back', fr: 'Retour' })}
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('form');
                            setStepIndex(3);
                        }}
                        className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-bold active:scale-[0.98] transition-all"
                    >
                        {t({ en: 'Next', fr: 'Suivant' })}
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Mode: Step 3 Detail ────────────────────────────────────────────────
    if (viewMode === 'step3_detail') {
        return (
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="fixed inset-0 z-[10000] bg-white flex flex-col font-plus-jakarta"
            >
                {/* Top Buttons Bar */}
                <div className="px-6 pt-6 pb-2 flex flex-col items-start gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all text-black"
                    >
                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter', ar: 'حفظ وخروج' })}
                    </button>
                    <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black hover:bg-neutral-50 active:scale-95 transition-all">
                        {t({ en: 'Questions?', fr: 'Des questions ?', ar: 'أسئلة؟' })}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pt-4 pb-32 overscroll-behavior-contain">
                    <motion.div
                        animate={{
                            y: [0, -12, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-[85%] aspect-square mb-8 rounded-[32px] overflow-hidden mx-auto"
                    >
                        <Image
                            src="/Images/PropertiesListingView/ThirdStep/ChatGPT Image Apr 25, 2026, 07_06_11 PM-Photoroom.png"
                            alt="Step 3"
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
                        <span className="text-[18px] font-medium text-black">
                            {t({ en: 'Step 3', fr: 'Étape 3', ar: 'الخطوة 3' })}
                        </span>
                        <h2 className="text-[32px] font-mediuù text-black leading-[1.1] tracking-tight">
                            {t({ en: 'Automate and publish', fr: 'Automatiser et Publier', ar: 'أكمل وانشر' })}
                        </h2>
                        <p className="text-[17px] text-neutral-500 leading-relaxed font-medium">
                            {t({
                                en: 'Finally, you choose your booking settings, set your pricing, and publish your listing.',
                                fr: 'Enfin, vous choisissez les paramètres de réservation, définissez votre tarification et publiez votre annonce.',
                                ar: 'أخيراً، تختار إعدادات الحجز، وتحدد أسعارك، وتنشر إعلانك.'
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
                        onClick={() => {
                            setViewMode('form');
                            setStepIndex(5);
                        }}
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


            {/* Content */}
            <div className={cn(
                "flex-1 overflow-y-auto overscroll-behavior-contain",
                (stepIndex === 1 || stepIndex === 3) ? "p-0" : "px-6 py-10"
            )}>
                <AnimatePresence mode="wait">
                    {viewMode === 'form' && (
                        <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn("space-y-8", stepIndex === 1 && "h-full")}
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
                                            const isApartment = pt.id === 'apartment';

                                            return (
                                                <button
                                                    key={pt.id}
                                                    onClick={() => setType(pt.id)}
                                                    className={`flex flex-col items-start justify-between p-4 rounded-xl border transition-all h-[120px] ${isActive ? 'border-black ring-1 ring-black bg-neutral-50' : 'border-neutral-200 hover:border-black'}`}
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center">
                                                        {isApartment && isActive ? (
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
                                </div>
                            )}

                            {stepIndex === 1 && (
                                <div className="absolute inset-0 z-[100] bg-white">
                                    <LocationPicker
                                        mode="single"
                                        serviceType="bricoler-base"
                                        serviceIcon="🏠"
                                        autoLocate={true}
                                        onClose={() => setStepIndex(0)}
                                        isInline={true}
                                        isHostWizard={true}
                                        onConfirm={({ pickup, savedAddress }) => {
                                            setBaseLat(pickup.lat);
                                            setBaseLng(pickup.lng);
                                            setAddress(pickup.address);
                                            if (savedAddress?.buildingName) {
                                                setName(savedAddress.buildingName);
                                            }
                                            if (savedAddress?.floorNumber) {
                                                setFloor(parseInt(savedAddress.floorNumber) || 0);
                                            }
                                            if (savedAddress?.doorNumber) {
                                                setApartmentNumber(savedAddress.doorNumber);
                                            }
                                            setStepIndex(s => s + 1);
                                        }}
                                    />
                                </div>
                            )}

                            {stepIndex === 2 && (
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <h2 className="text-[27px] font-black text-black leading-[1.1] tracking-tight">
                                            {t({
                                                en: 'Give the main information about your accommodation',
                                                fr: 'Donnez les informations principales concernant votre logement',
                                                ar: 'قدم المعلومات الأساسية عن مسكنك'
                                            })}
                                        </h2>
                                        <p className="text-[18px] text-neutral-500 font-medium leading-relaxed">
                                            {t({
                                                en: 'You can add other information later, like bed types.',
                                                fr: 'Vous pourrez ajouter d\'autres informations plus tard, comme les types de lit.',
                                                ar: 'يمكنك إضافة معلومات أخرى لاحقاً، مثل أنواع الأسرّة.'
                                            })}
                                        </p>
                                    </div>

                                    <div className="divide-y divide-[#E4E4E4]">
                                        {/* Voyageurs */}
                                        <CounterRow
                                            label={t({ en: 'Guests', fr: 'Voyageurs', ar: 'الضيوف' })}
                                            value={guests}
                                            onChange={setGuests}
                                            min={1}
                                        />

                                        {/* Chambres */}
                                        <CounterRow
                                            label={t({ en: 'Bedrooms', fr: 'Chambres', ar: 'غرف النوم' })}
                                            value={bedrooms}
                                            onChange={setBedrooms}
                                            min={1}
                                        />

                                        {/* Lits */}
                                        <CounterRow
                                            label={t({ en: 'Beds', fr: 'Lits', ar: 'الأسرّة' })}
                                            value={beds}
                                            onChange={setBeds}
                                            min={1}
                                        />

                                        {/* Salles de bain */}
                                        <CounterRow
                                            label={t({ en: 'Bathrooms', fr: 'Salles de bain', ar: 'الحمامات' })}
                                            value={bathrooms}
                                            onChange={setBathrooms}
                                            min={1}
                                        />
                                    </div>
                                </div>
                            )}

                            {stepIndex === 3 && (
                                <div className="flex flex-col h-full bg-white">
                                    <div className="px-6 pt-10 pb-6">
                                        <h2 className="text-[26px] font-bold text-black leading-[1.15] tracking-tight mb-2">
                                            {t({
                                                en: 'List your property\'s amenities to get tailored service suggestions.',
                                                fr: 'Indiquez les équipements de votre logement pour recevoir des suggestions de services personnalisées.',
                                                ar: 'أضف مرافق مكان إقامتك لتلقي اقتراحات خدمات مخصصة.'
                                            })}
                                        </h2>

                                    </div>

                                    <div className="flex-1 overflow-y-auto px-6 pb-32">
                                        <div className="space-y-12">
                                            {AMENITY_GROUPS.map((group) => (
                                                <div key={group.id} className="space-y-6">
                                                    <h3 className="text-[18px] font-bold text-black leading-tight">
                                                        {t(group.title)}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {group.items.map((amenity) => {
                                                            const Icon = amenity.icon;
                                                            const isSelected = selectedAmenities.includes(amenity.id);

                                                            return (
                                                                <button
                                                                    key={amenity.id}
                                                                    onClick={() => {
                                                                        setSelectedAmenities(prev =>
                                                                            prev.includes(amenity.id)
                                                                                ? prev.filter(id => id !== amenity.id)
                                                                                : [...prev, amenity.id]
                                                                        );
                                                                    }}
                                                                    className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all h-[130px] text-left gap-3 ${isSelected
                                                                        ? 'border-black bg-neutral-50 ring-1 ring-black'
                                                                        : 'border-neutral-100 hover:border-neutral-300'
                                                                        }`}
                                                                >
                                                                    <Icon size={32} strokeWidth={1.5} className="text-black" />
                                                                    <span className="text-[15px] font-bold text-black leading-tight">
                                                                        {t(amenity.label)}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {stepIndex === 4 && (
                                <div className="space-y-6 relative h-full flex flex-col">
                                    {photos.length === 0 ? (
                                        <>
                                            <div className="flex flex-col items-start gap-2 pb-2">
                                                <button
                                                    onClick={onClose}
                                                    className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                                >
                                                    {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                                </button>
                                                <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                                    {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                                </button>
                                            </div>
                                            <h2 className="text-[28px] font-medium text-black leading-tight tracking-tight">
                                                {t({
                                                    en: 'Add some photos of your property',
                                                    fr: 'Ajoutez quelques photos de votre appartement',
                                                    ar: 'أضف بعض الصور لعقارك'
                                                })}
                                            </h2>
                                            <p className="text-[17px] text-neutral-500 leading-relaxed">
                                                {t({
                                                    en: 'To start, you will need 5 photos. You can add more or make changes later.',
                                                    fr: 'Pour commencer, vous aurez besoin de 5 photos. Vous pourrez en ajouter d\'autres ou faire des modifications plus tard.',
                                                    ar: 'للبدء، ستحتاج إلى 5 صور. يمكنك إضافة المزيد أو إجراء تغييرات لاحقاً.'
                                                })}
                                            </p>

                                            <div className="space-y-3 pt-4 relative">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    className="hidden"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                />
                                                <input
                                                    type="file"
                                                    ref={cameraInputRef}
                                                    className="hidden"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={handleFileUpload}
                                                />
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="w-full p-6 rounded-xl border border-neutral-200 flex items-center justify-start gap-6 active:scale-[0.98] transition-all hover:bg-neutral-50 disabled:opacity-50"
                                                >
                                                    <Plus className="text-black shrink-0" size={24} strokeWidth={1.5} />
                                                    <span className="text-[16px] font-medium text-black">
                                                        {isUploading ? 'Chargement...' : t({ en: 'Add photos', fr: 'Ajouter des photos', ar: 'إضافة صور' })}
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="w-full p-6 rounded-xl border border-neutral-200 flex items-center justify-start gap-6 active:scale-[0.98] transition-all hover:bg-neutral-50 disabled:opacity-50"
                                                >
                                                    <Camera className="text-black shrink-0" size={24} strokeWidth={1.5} />
                                                    <span className="text-[16px] font-medium text-black">
                                                        {isUploading ? 'Chargement...' : t({ en: 'Take new photos', fr: 'Prendre de nouvelles photos', ar: 'التقاط صور جديدة' })}
                                                    </span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h2 className="text-[28px] font-bold text-black leading-tight tracking-tight">Vos photos</h2>
                                                    <p className="text-[17px] text-neutral-500 font-medium mt-1">Faites glisser pour réorganiser</p>
                                                </div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-12 h-12 rounded-full border border-neutral-200 flex items-center justify-center active:scale-95 transition-all bg-neutral-50"
                                                >
                                                    <Plus size={24} className="text-black" />
                                                </button>
                                            </div>

                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                            />

                                            <div className="grid grid-cols-2 gap-3 pb-32">
                                                {photos.map((photo, idx) => (
                                                    <div
                                                        key={idx}
                                                        draggable
                                                        onDragStart={() => handleDragStart(idx)}
                                                        onDragOver={(e) => handleDragOver(e, idx)}
                                                        onDrop={() => handleDrop(idx)}
                                                        onDragEnd={() => setDragOverIndex(null)}
                                                        className={cn(
                                                            "relative overflow-hidden bg-neutral-100 border rounded-xl cursor-grab active:cursor-grabbing transition-all",
                                                            idx === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square",
                                                            dragOverIndex === idx ? "border-black ring-2 ring-black scale-[0.98] opacity-80" : "border-neutral-200"
                                                        )}
                                                    >
                                                        <Image src={photo} alt="Property" fill className="object-cover pointer-events-none" />

                                                        {idx === 0 && (
                                                            <div className="absolute top-3 left-3 bg-white px-3 py-1.5 rounded-lg text-[13px] font-bold shadow-sm">
                                                                Couverture
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={() => deletePhoto(idx)}
                                                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all hover:bg-red-50"
                                                        >
                                                            <Trash2 size={15} className="text-neutral-600 hover:text-red-500 transition-colors" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {isUploading && (
                                                    <div className="aspect-square relative overflow-hidden bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-center">
                                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }}>
                                                            <Coffee className="text-neutral-400" size={24} />
                                                        </motion.div>
                                                    </div>
                                                )}
                                            </div>

                                            <AnimatePresence>
                                                {showPhotoAdvice && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 50 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 50 }}
                                                        className="fixed bottom-[130px] left-4 right-4 bg-[#F2F0EC] p-6 rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[10010] border border-neutral-100"
                                                    >
                                                        <button
                                                            onClick={() => setShowPhotoAdvice(false)}
                                                            className="absolute top-5 right-5 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                                        >
                                                            <X size={18} className="text-black" />
                                                        </button>
                                                        <h3 className="text-[20px] font-bold text-black mb-2 max-w-[85%] leading-tight">Commencez avec vos plus belles photos</h3>
                                                        <p className="text-[15px] text-neutral-500 mb-4 leading-relaxed pr-2">Triez instantanément vos photos pour que les meilleures apparaissent en premier.</p>
                                                        <button
                                                            onClick={() => setShowPhotoAdvice(false)}
                                                            className="text-[16px] font-bold text-black underline underline-offset-4"
                                                        >
                                                            Organiser les photos
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                </div>
                            )}

                            {stepIndex === 5 && (
                                <div className="space-y-6 relative h-full flex flex-col">
                                    <div className="flex flex-col items-start gap-2 pb-2">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                        >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                        <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                        </button>
                                    </div>
                                    <h2 className="text-[28px] font-medium text-black leading-tight tracking-tight mt-4">
                                        {t({
                                            en: `Choose the activities you want to automate`,
                                            fr: `Choisissez les activités que vous souhaitez automatiser`,
                                            ar: `اختر الأنشطة التي تود أتمتتها`
                                        })}
                                    </h2>
                                    <div className="min-h-[48px] mb-6">
                                        {activeServiceInfo ? (
                                            <motion.p
                                                key={activeServiceInfo}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[17px] text-black font-medium leading-relaxed"
                                            >
                                                <Typewriter text={activeServiceInfo} />
                                            </motion.p>
                                        ) : (
                                            <p className="text-[17px] text-neutral-500 leading-relaxed">
                                                {t({
                                                    en: 'They will be useful to manage your property.',
                                                    fr: 'Ils seront utiles pour gérer votre logement.',
                                                    ar: 'ستكون مفيدة لإدارة مسكنك.'
                                                })}
                                            </p>
                                        )}
                                    </div>

                                    <motion.div
                                        className="flex flex-wrap gap-3 mt-2"
                                        initial="hidden"
                                        animate="show"
                                        variants={{
                                            hidden: { opacity: 0 },
                                            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                        }}
                                    >
                                        {SERVICES_CATALOGUE.filter(c => !c.disabled && ['cleaning', 'gardening', 'glass_cleaning', 'pool_cleaning', 'errands', 'pets_care', 'guest_receptionist'].includes(c.id)).map(category => {
                                            const isSelected = selectedServices.includes(category.id);
                                            const Icon = SERVICE_ICONS[category.id] || Sparkles;
                                            return (
                                                <motion.button
                                                    key={category.id}
                                                    onClick={() => {
                                                        toggleService(category.id);
                                                        if (!isSelected) {
                                                            const bullet = category.bullets?.[0];
                                                            if (bullet) {
                                                                setActiveServiceInfo(t({
                                                                    en: bullet.en,
                                                                    fr: bullet.fr,
                                                                    ar: bullet.ar || bullet.fr
                                                                }));
                                                            }
                                                        } else {
                                                            setActiveServiceInfo(null);
                                                        }
                                                    }}

                                                    variants={{
                                                        hidden: { opacity: 0, scale: 0.9, y: 10 },
                                                        show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`flex items-center gap-3 px-6 py-3.5 rounded-full border transition-colors ${isSelected
                                                        ? 'border-black ring-1 ring-black bg-neutral-50 shadow-sm'
                                                        : 'border-neutral-200 hover:border-black'
                                                        }`}
                                                >
                                                    <Icon size={20} className="text-black" />
                                                    <span className="text-[16px] font-medium text-black">
                                                        {t({ en: category.label, fr: category.labelFr, ar: category.labelAr || category.labelFr })}
                                                    </span>
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                </div>
                            )}
                            {stepIndex === 6 && (
                                <div className="space-y-6 relative h-full flex flex-col">
                                    <div className="flex flex-col items-start gap-2 pb-2">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                        >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                        <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                        </button>
                                    </div>
                                    <h2 className="text-[28px] font-medium text-black leading-tight tracking-tight mt-4">
                                        {t({
                                            en: `What services you may want to offer to your guests?`,
                                            fr: `Quels services souhaitez-vous offrir à vos voyageurs ?`,
                                            ar: `ما هي الخدمات التي قد ترغب في تقديمها لضيوفك؟`
                                        })}
                                    </h2>

                                    <div className="min-h-[48px] mb-4">
                                        {activeServiceInfo ? (
                                            <motion.p
                                                key={activeServiceInfo}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[17px] text-black font-medium leading-relaxed"
                                            >
                                                <Typewriter text={activeServiceInfo} />
                                            </motion.p>
                                        ) : null}
                                    </div>

                                    <motion.div
                                        className="flex flex-wrap gap-3 mt-2"
                                        initial="hidden"
                                        animate="show"
                                        variants={{
                                            hidden: { opacity: 0 },
                                            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                        }}
                                    >
                                        {[
                                            { id: 'airport_pickup', label: 'Airport pickup', labelFr: 'Transfert Aéroport', labelAr: 'نقل من المطار' },
                                            { id: 'guest_receptionist', label: 'Guest Receptionist', labelFr: 'Accueil Voyageurs', labelAr: 'استقبال الضيوف' },
                                            ...SERVICES_CATALOGUE.filter(c => !c.disabled && ['cooking', 'tour_guide', 'private_driver', 'car_rental', 'learn_arabic', 'babysitting', 'elderly_care'].includes(c.id))
                                        ].map(category => {
                                            const isSelected = selectedServices.includes(category.id);
                                            const Icon = SERVICE_ICONS[category.id] || Sparkles;
                                            return (
                                                <motion.button
                                                    key={category.id}
                                                    onClick={() => {
                                                        toggleService(category.id);
                                                        if (!isSelected) {
                                                            let info = '';
                                                            if (category.id === 'airport_pickup') {
                                                                info = t({
                                                                    en: 'A professional driver will pick up your guests at the airport.',
                                                                    fr: 'Un chauffeur professionnel accueillera vos voyageurs à l\'aéroport.',
                                                                    ar: 'سائق محترف سيستقبل ضيوفك في المطار.'
                                                                });
                                                            } else if (category.id === 'guest_receptionist') {
                                                                info = t({
                                                                    en: 'A professional receptionist will greet your guests and guide them.',
                                                                    fr: 'Un réceptionniste professionnel accueillera vos voyageurs et les guidera.',
                                                                    ar: 'موظف استقبال محترف سيستقبل ضيوفك ويوجههم.'
                                                                });
                                                            } else {
                                                                const catInCatalogue = SERVICES_CATALOGUE.find(c => c.id === category.id);
                                                                const bullet = catInCatalogue?.bullets?.[0];
                                                                if (bullet) {
                                                                    info = t({ en: bullet.en, fr: bullet.fr, ar: bullet.ar || bullet.fr });
                                                                }
                                                            }
                                                            if (info) setActiveServiceInfo(info);
                                                        } else {
                                                            setActiveServiceInfo(null);
                                                        }
                                                    }}

                                                    variants={{
                                                        hidden: { opacity: 0, scale: 0.9, y: 10 },
                                                        show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`flex items-center gap-3 px-6 py-3.5 rounded-full border transition-colors ${isSelected
                                                        ? 'border-black ring-1 ring-black bg-neutral-50 shadow-sm'
                                                        : 'border-neutral-200 hover:border-black'
                                                        }`}
                                                >
                                                    <Icon size={20} className="text-black" />
                                                    <span className="text-[16px] font-medium text-black">
                                                        {t({ en: category.label, fr: category.labelFr || category.label, ar: category.labelAr || category.labelFr || category.label })}
                                                    </span>
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                </div>
                            )}
                            {stepIndex === 7 && (
                                <div className="space-y-6 relative h-full flex flex-col">
                                    <div className="flex flex-col items-start gap-2 pb-2">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                        >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                        <button className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                        </button>
                                    </div>
                                    <h2 className="text-[28px] font-medium text-black leading-tight tracking-tight mt-4">
                                        {t({
                                            en: `What other services you may need for your property?`,
                                            fr: `Quels autres services pourriez-vous nécessiter pour votre propriété?`,
                                            ar: `ما هي الخدمات الأخرى التي قد تحتاجها في المستقبل؟`
                                        })}
                                    </h2>

                                    <div className="min-h-[48px] mb-4">
                                        {activeServiceInfo ? (
                                            <motion.p
                                                key={activeServiceInfo}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[17px] text-black font-medium leading-relaxed"
                                            >
                                                <Typewriter text={activeServiceInfo} />
                                            </motion.p>
                                        ) : null}
                                    </div>

                                    <motion.div
                                        className="flex flex-wrap gap-3 mt-2"
                                        initial="hidden"
                                        animate="show"
                                        variants={{
                                            hidden: { opacity: 0 },
                                            show: { opacity: 1, transition: { staggerChildren: 0.05 } }
                                        }}
                                    >
                                        {SERVICES_CATALOGUE.filter(c => !c.disabled && ['home_repairs', 'furniture_assembly', 'mounting', 'moving', 'plumbing', 'electricity', 'painting'].includes(c.id)).map(category => {
                                            const isSelected = selectedServices.includes(category.id);
                                            const Icon = SERVICE_ICONS[category.id] || Sparkles;
                                            return (
                                                <motion.button
                                                    key={category.id}
                                                    onClick={() => {
                                                        toggleService(category.id);
                                                        if (!isSelected) {
                                                            const bullet = category.bullets?.[0];
                                                            if (bullet) {
                                                                setActiveServiceInfo(t({
                                                                    en: bullet.en,
                                                                    fr: bullet.fr,
                                                                    ar: bullet.ar || bullet.fr
                                                                }));
                                                            }
                                                        } else {
                                                            setActiveServiceInfo(null);
                                                        }
                                                    }}

                                                    variants={{
                                                        hidden: { opacity: 0, scale: 0.9, y: 10 },
                                                        show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                                                    }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={`flex items-center gap-3 px-6 py-3.5 rounded-full border transition-colors ${isSelected
                                                        ? 'border-black ring-1 ring-black bg-neutral-50 shadow-sm'
                                                        : 'border-neutral-200 hover:border-black'
                                                        }`}
                                                >
                                                    <Icon size={20} className="text-black" />
                                                    <span className="text-[16px] font-medium text-black">
                                                        {t({ en: category.label, fr: category.labelFr || category.label, ar: category.labelAr || category.labelFr || category.label })}
                                                    </span>
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {viewMode === 'service_detail_form' && (
                        <motion.div
                            key="service-detail-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            {currentDetailServiceId === 'cleaning' && (
                                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-bold hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                        >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="text-[28px] font-medium text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Tell us more about your cleaning needs`,
                                            fr: `Dites-nous en plus sur vos besoins en nettoyage`,
                                            ar: `أخبرنا المزيد عن احتياجات التنظيف الخاصة بك`
                                        })}
                                    </h2>

                                    {/* Sub-services Selection */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="text-[18px] font-bold text-black">
                                            {t({ en: 'What type of cleaning do you need?', fr: 'Quel type de nettoyage avez-vous besoin ?' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'hospitality', label: 'Hospitality-level cleaning', labelFr: 'Nettoyage niveau hôtelier' },
                                                { id: 'deep', label: 'Deep cleaning', labelFr: 'Grand ménage / Nettoyage en profondeur' },
                                                { id: 'stairs', label: 'Stairs cleaning', labelFr: 'Nettoyage des escaliers' }
                                            ].map(sub => {
                                                const isSubSelected = cleaningSubServices.includes(sub.id);
                                                return (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => {
                                                            if (isSubSelected) setCleaningSubServices(prev => prev.filter(s => s !== sub.id));
                                                            else setCleaningSubServices(prev => [...prev, sub.id]);
                                                        }}
                                                        className={`px-5 py-3 rounded-full border transition-all text-[15px] font-medium ${isSubSelected ? 'border-black border-[1.5px] bg-[#F7F7F7] text-black' : 'border-neutral-200 text-black hover:border-black'
                                                            }`}
                                                    >
                                                        {t({ en: sub.label, fr: sub.labelFr })}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Frequency / Schedule for each selected sub-service */}
                                    {cleaningSubServices.map(subId => (
                                        <motion.div
                                            key={subId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-4 mb-10 p-6 rounded-[15px] border border-[#2C2C2C] border-[1.5px]  "
                                        >
                                            <h4 className="text-[17px] font-medium text-black">
                                                {subId === 'hospitality' && t({ en: 'When should we do the post-checkout cleaning?', fr: 'Quand devrions-nous faire le ménage après chaque départ ?' })}
                                                {subId === 'deep' && t({ en: 'How often do you need a deep cleaning?', fr: 'À quelle fréquence avez-vous besoin d\'un grand ménage ?' })}
                                                {subId === 'stairs' && t({ en: 'How often do you need stairs cleaning?', fr: 'À quelle fréquence avez-vous besoin du nettoyage des escaliers ?' })}
                                            </h4>

                                            {subId === 'hospitality' ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="time"
                                                        value={cleaningFrequencies[subId] || '11:00'}
                                                        onChange={(e) => setCleaningFrequencies(prev => ({ ...prev, [subId]: e.target.value }))}
                                                        className="px-4 py-3 rounded-[12px] bg-[#F2F2F3]  focus:outline-none focus:ring-2 focus:ring-black text-[16px]"
                                                    />
                                                    <span className="text-neutral-500 text-[15px]">{t({ en: 'Standard hour', fr: 'Heure standard' })}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { id: '2w', en: 'Each two weeks', fr: 'Toutes les deux semaines' },
                                                        { id: '1m', en: 'Each month', fr: 'Chaque mois' },
                                                        { id: '2m', en: 'Each two months', fr: 'Tous les deux mois' },
                                                        { id: '3m', en: 'Each three months', fr: 'Tous les trois mois' }
                                                    ].map(freq => (
                                                        <button
                                                            key={freq.id}
                                                            onClick={() => setCleaningFrequencies(prev => ({ ...prev, [subId]: freq.id }))}
                                                            className={`px-4 py-2 rounded-full border text-[14px] transition-all ${cleaningFrequencies[subId] === freq.id ? 'bg-[#F7F7F7] text-black border-[#2C2C2C] border-[1.5px]' : 'bg-white text-black border-neutral-200 hover:border-black'
                                                                }`}
                                                        >
                                                            {t({ en: freq.en, fr: freq.fr })}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}

                                    {/* Checklist */}
                                    {cleaningSubServices.length > 0 && (
                                        <div className="space-y-4 mb-10">
                                            <h3 className="text-[18px] font-bold text-black">
                                                {t({ en: 'Specific instructions / Checklist', fr: 'Instructions spécifiques / Checklist' })}
                                            </h3>
                                            <p className="text-[15px] text-neutral-500 leading-relaxed mb-4">
                                                {t({
                                                    en: 'Write down what you want the bricolers to follow during their service.',
                                                    fr: 'Notez ce que vous voulez que les bricoleurs suivent pendant leur service.'
                                                })}
                                            </p>
                                            <div className="space-y-3">
                                                {cleaningChecklist.map((item, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            onChange={(e) => {
                                                                const newChecklist = [...cleaningChecklist];
                                                                newChecklist[idx] = e.target.value;
                                                                setCleaningChecklist(newChecklist);
                                                            }}
                                                            placeholder={t({ en: 'e.g., Wash the terrace, Check for forgotten items...', fr: 'ex: Laver la terrasse, Vérifier les objets oubliés...' })}
                                                            className="flex-1 px-4 py-3 rounded-[12px] border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black text-[16px]"
                                                        />
                                                        {idx === cleaningChecklist.length - 1 ? (
                                                            <button
                                                                onClick={() => setCleaningChecklist(prev => [...prev, ''])}
                                                                className="w-12 h-12 rounded-[12px] bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                                            >
                                                                <Plus size={20} className="text-black" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setCleaningChecklist(prev => prev.filter((_, i) => i !== idx))}
                                                                className="w-12 h-12 rounded-[12px] bg-neutral-50 flex items-center justify-center hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reference Photos */}
                                    {cleaningSubServices.length > 0 && (
                                        <div className="space-y-4 mb-10">
                                            <h3 className="text-[18px] font-bold text-black">
                                                {t({ en: 'Reference photos', fr: 'Photos de référence' })}
                                            </h3>
                                            <p className="text-[15px] text-neutral-500 leading-relaxed mb-4">
                                                {t({
                                                    en: 'Upload photos showing the standard of cleanliness you expect (e.g., how the bed should be made, how to organize towels).',
                                                    fr: 'Téléchargez des photos montrant le niveau de propreté attendu (ex: comment faire le lit, comment organiser les serviettes).'
                                                })}
                                            </p>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {cleaningPhotos.map((photo, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                                                        <img src={photo} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => setCleaningPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-full text-black hover:bg-white transition-all shadow-sm"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={() => cleaningPhotoInputRef.current?.click()}
                                                    disabled={isUploadingCleaningPhotos}
                                                    className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 hover:border-black transition-all group active:scale-95"
                                                >
                                                    {isUploadingCleaningPhotos ? (
                                                        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Camera size={24} className="text-neutral-400 group-hover:text-black transition-colors" />
                                                            <span className="text-[13px] font-bold text-neutral-500 group-hover:text-black transition-colors">
                                                                {t({ en: 'Add photo', fr: 'Ajouter' })}
                                                            </span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                ref={cleaningPhotoInputRef}
                                                onChange={handleCleaningPhotoUpload}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Generic placeholder for other services if needed */}
                            {currentDetailServiceId && currentDetailServiceId !== 'cleaning' && (
                                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                                    <h2 className="text-[28px] font-medium text-black leading-tight tracking-tight mb-4">
                                        {t({ en: `Tell us more about ${currentDetailServiceId}`, fr: `Dites-nous en plus sur ${currentDetailServiceId}` })}
                                    </h2>
                                    <p className="text-neutral-500">
                                        {t({ en: 'Further details for this service will be added soon.', fr: 'D\'autres détails pour ce service seront ajoutés bientôt.' })}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {stepIndex !== 1 && (
                <div className="px-6 py-6 border-t border-neutral-100 bg-white z-20">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={handleBack}
                            className="text-[17px] font-bold text-black underline underline-offset-4"
                        >
                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-bold active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {(() => {
                                if (isSubmitting) return 'Publication...';

                                const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
                                const isLastDetailService = currentDetailServiceId && selectedAutomationServices.indexOf(currentDetailServiceId) === selectedAutomationServices.length - 1;

                                if (viewMode === 'form' && stepIndex === STEPS.length - 1) {
                                    if (selectedAutomationServices.length > 0) return 'Suivant';
                                    return 'Publier l\'annonce';
                                }

                                if (viewMode === 'service_detail_form') {
                                    if (isLastDetailService) return 'Publier l\'annonce';
                                    return 'Suivant';
                                }

                                return 'Suivant';
                            })()}
                        </button>
                    </div>

                    {/* Segmented Progress Bar */}
                    <div className="flex gap-2 h-[2px] mt-2">
                        {[0, 1, 2].map((stageIdx) => {
                            let isActive = false;
                            if (stageIdx === 0 && stepIndex <= 2) isActive = true;
                            if (stageIdx === 1 && (stepIndex === 3 || stepIndex === 4)) isActive = true; // Amenities and Photos is stage 2
                            if (stageIdx === 2 && stepIndex >= 5) isActive = true; // Automation is stage 3

                            const isFinished = (stageIdx === 0 && stepIndex > 2) || (stageIdx === 1 && stepIndex > 4);

                            return (
                                <div
                                    key={stageIdx}
                                    className={`flex-1 rounded-full transition-all duration-500 ${isActive || isFinished ? 'bg-black' : 'bg-neutral-200'}`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertySetupWizard;
