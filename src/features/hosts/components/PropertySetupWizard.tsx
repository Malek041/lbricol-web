"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronDown, Home, Building, Building2, MapPin,
    Wifi, Tv, Pocket as Kitchen, Wind as Ac, Waves as Pool, Wind, Waves,
    Check, ChevronRight, Save, ShieldCheck, Warehouse, Coffee, Ship, Tent, Truck, Castle,
    Hotel as HotelIcon, Palmtree, Bed, Landmark, Search, Navigation,
    WashingMachine, Car, ParkingCircle, Monitor, Bath, Fence, Flame, Utensils, Dices,
    Music, Dumbbell, Mountain, ShowerHead, SquarePlus, Snowflake,
    TreePine, PawPrint, Baby, Camera, Plus, Trash2, Info,
    Sparkles, Key, Shirt, Wrench, Package, MonitorUp, Droplets, Zap, Paintbrush, Heart, ChefHat, Map, BookOpen, Hammer, Plane, BellRing,
    Bot, Handshake, Copy, Flower2, LayoutGrid, MessageSquare, Calendar, Bookmark, Menu, User, CheckCircle2, FireExtinguisher, ShieldAlert
} from 'lucide-react';
import { TbGrill, TbCampfire, TbAlarmSmoke } from 'react-icons/tb';
import { MdOutlineFireplace, MdOutlineCo2 } from 'react-icons/md';
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
            { id: 'bbq', label: { en: 'BBQ grill', fr: 'Barbecue' }, icon: TbGrill },
            { id: 'outdoor_dining', label: { en: 'Outdoor dining area', fr: 'Espace repas en plein air' }, icon: Utensils },
            { id: 'fire_pit', label: { en: 'Fire pit', fr: 'Brasero' }, icon: TbCampfire },
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
            { id: 'smoke_alarm', label: { en: 'Smoke alarm', fr: 'Détecteur de fumée' }, icon: BellRing },
            { id: 'first_aid_kit', label: { en: 'First aid kit', fr: 'Trousse de premiers secours' }, icon: SquarePlus },
            { id: 'fire_extinguisher', label: { en: 'Fire extinguisher', fr: 'Extincteur' }, icon: FireExtinguisher },
            { id: 'carbon_monoxide_alarm', label: { en: 'Carbon monoxide alarm', fr: 'Détecteur de monoxyde de carbone' }, icon: ShieldAlert },
        ]
    }
];

const PROPERTY_TYPES = [
    { id: 'apartment', label: { en: 'Apartment', fr: 'Appartement' }, icon: Building },
    { id: 'villa', label: { en: 'Villa', fr: 'Villa' }, icon: Home },
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
        <span className="font-medium text-[18px] text-black">{label}</span>
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
        }, 5);
        return () => clearInterval(interval);
    }, [text]);

    return <span>{displayedText}</span>;
};



const PropertySetupWizard: React.FC<PropertySetupWizardProps> = ({ isOpen, onClose, onComplete }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [viewMode, setViewMode] = useState<'intro_overview' | 'dispatch_intro' | 'step1_detail' | 'step2_detail' | 'step3_detail' | 'form' | 'service_detail_form' | 'team_mode_select' | 'published_success'>('intro_overview');
    const [stepIndex, setStepIndex] = useState(0);
    const [currentDetailServiceId, setCurrentDetailServiceId] = useState<string | null>(null);
    const [teamMode, setTeamMode] = useState<'lbricol' | 'own_team' | 'both' | null>(null);
    const [teamInvites, setTeamInvites] = useState<string[]>(['']);
    const [serviceCodes, setServiceCodes] = useState<Record<string, string>>({});

    // Cleaning Details State
    const [cleaningSubServices, setCleaningSubServices] = useState<string[]>([]);
    const [cleaningFrequencies, setCleaningFrequencies] = useState<Record<string, string>>({});
    const [cleaningChecklist, setCleaningChecklist] = useState<string[]>(['']);
    const [cleaningPhotos, setCleaningPhotos] = useState<string[]>([]);
    const [isUploadingCleaningPhotos, setIsUploadingCleaningPhotos] = useState(false);
    const [stairsSize, setStairsSize] = useState<'small' | 'medium' | 'big'>('medium');
    const cleaningPhotoInputRef = useRef<HTMLInputElement>(null);
    const [activeServiceInfo, setActiveServiceInfo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);



    // Glass Cleaning Details State
    const [windowsCount, setWindowsCount] = useState(1);
    const [windowsSize, setWindowsSize] = useState<'small' | 'medium' | 'big'>('medium');
    const [windowsCoverage, setWindowsCoverage] = useState<'interior' | 'exterior' | 'both'>('both');
    const [windowsAccessibility, setWindowsAccessibility] = useState<'ground' | 'ladder'>('ground');

    // Receptionist Details State
    const [receptionChecklist, setReceptionChecklist] = useState<string[]>(['']);

    // Gardening Details State
    const [gardeningSubServices, setGardeningSubServices] = useState<string[]>([]);
    const [gardenSize, setGardenSize] = useState<'small' | 'medium' | 'large' | 'estate'>('medium');
    const [shouldBringMower, setShouldBringMower] = useState<boolean>(false);
    const [treeCount, setTreeCount] = useState(1);
    const [averageTreeHeight, setAverageTreeHeight] = useState<number>(2);
    const [preferredTreeService, setPreferredTreeService] = useState<string | null>(null);
    const [isWasteRemovalIncluded, setIsWasteRemovalIncluded] = useState<boolean>(false);
    const [gardeningFrequency, setGardeningFrequency] = useState<string>('month');
    const [gardeningChecklist, setGardeningChecklist] = useState<string[]>(['']);
    const [gardeningPhotos, setGardeningPhotos] = useState<string[]>([]);
    const [isUploadingGardeningPhotos, setIsUploadingGardeningPhotos] = useState(false);
    const gardeningPhotoInputRef = useRef<HTMLInputElement>(null);

    // Pool Cleaning State
    const [poolType, setPoolType] = useState<'in_ground' | 'above_ground' | 'infinity' | 'indoor'>('in_ground');
    const [poolWaterType, setPoolWaterType] = useState<'chlorine' | 'saltwater'>('chlorine');
    const [poolSize, setPoolSize] = useState<'small' | 'medium' | 'large' | 'estate'>('medium');
    const [poolDepth, setPoolDepth] = useState<number>(1.5);
    const [poolSubServices, setPoolSubServices] = useState<string[]>(['skimming', 'vacuuming', 'chemistry']);
    const [poolTechnicalRoomLocation, setPoolTechnicalRoomLocation] = useState('');
    const [poolSuppliesLocation, setPoolSuppliesLocation] = useState('');
    const [poolHasRobot, setPoolHasRobot] = useState(false);
    const [poolFrequency, setPoolFrequency] = useState('week');
    const [poolChecklist, setPoolChecklist] = useState<string[]>(['']);

    // Pets Care State
    const [petTypes, setPetTypes] = useState<string[]>([]);
    const [petFeedingFrequency, setPetFeedingFrequency] = useState('twice');
    const [petWalkingNeeded, setPetWalkingNeeded] = useState(false);
    const [petMedicationNeeded, setPetMedicationNeeded] = useState(false);
    const [petInstructions, setPetInstructions] = useState('');
    const [petEmergencyContact, setPetEmergencyContact] = useState('');
    const [petChecklist, setPetChecklist] = useState<string[]>(['']);

    // Errands & Restocking State
    const [errandsCategories, setErrandsCategories] = useState<string[]>([]);
    const [errandsChecklists, setErrandsChecklists] = useState<Record<string, { name: string, quantity: number, brands?: string[], frequency?: string }[]>>({});
    const [editingBrand, setEditingBrand] = useState<{ cat: string, idx: number } | null>(null);
    const [errandsInstructions, setErrandsInstructions] = useState('');
    const [errandsFrequency, setErrandsFrequency] = useState('post_checkout');
    const [errandsStorageLocation, setErrandsStorageLocation] = useState('');
    const [poolPhotos, setPoolPhotos] = useState<string[]>([]);
    const [isUploadingPoolPhotos, setIsUploadingPoolPhotos] = useState(false);
    const poolPhotoInputRef = useRef<HTMLInputElement>(null);

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

    const handleGardeningPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const tempUrls = files.map(file => URL.createObjectURL(file));
        setGardeningPhotos(prev => [...prev, ...tempUrls]);
        setIsUploadingGardeningPhotos(true);

        try {
            await Promise.all(files.map(async (file, index) => {
                const tempUrl = tempUrls[index];
                return new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const cloudinaryUrl = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/${auth.currentUser?.uid}/gardening`,
                                'lbricol_portfolio'
                            );
                            setGardeningPhotos(current => current.map(p => p === tempUrl ? cloudinaryUrl : p));
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
            console.error('Failed to upload gardening reference photos:', error);
        } finally {
            setIsUploadingGardeningPhotos(false);
            if (e.target) e.target.value = '';
        }
    };

    const handlePoolPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const tempUrls = files.map(file => URL.createObjectURL(file));
        setPoolPhotos(prev => [...prev, ...tempUrls]);
        setIsUploadingPoolPhotos(true);

        try {
            await Promise.all(files.map(async (file, index) => {
                const tempUrl = tempUrls[index];
                return new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const cloudinaryUrl = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/${auth.currentUser?.uid}/pool`,
                                'lbricol_portfolio'
                            );
                            setPoolPhotos(current => current.map(p => p === tempUrl ? cloudinaryUrl : p));
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
            console.error('Failed to upload pool reference photos:', error);
        } finally {
            setIsUploadingPoolPhotos(false);
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

    useEffect(() => {
        if (viewMode === 'team_mode_select') {
            const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
            const newCodes = { ...serviceCodes };
            let updated = false;

            selectedAutomationServices.forEach(serviceId => {
                if (!newCodes[serviceId]) {
                    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                    newCodes[serviceId] = code;
                    updated = true;
                }
            });

            if (updated) {
                setServiceCodes(newCodes);
            }
        }
    }, [viewMode, selectedServices]);

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
                setViewMode('dispatch_intro');
                return;
            }
            if (stepIndex === STEPS.length - 1) {
                const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
                if (selectedAutomationServices.length > 0) {
                    setViewMode('service_detail_form');
                    setCurrentDetailServiceId(selectedAutomationServices[0]);
                    return;
                } else {
                    setViewMode('team_mode_select');
                    return;
                }
            }
        }

        if (viewMode === 'team_mode_select') {
            handleSubmit();
            return;
        }

        if (viewMode === 'service_detail_form') {
            const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
            const currentIndex = selectedAutomationServices.indexOf(currentDetailServiceId!);

            if (currentIndex < selectedAutomationServices.length - 1) {
                setCurrentDetailServiceId(selectedAutomationServices[currentIndex + 1]);
                return;
            } else {
                setViewMode('team_mode_select');
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
            if (stepIndex === 3) {
                setViewMode('step2_detail');
                return;
            }
            if (stepIndex === 5) {
                setViewMode('dispatch_intro');
                return;
            }
            if (stepIndex > 0) {
                setStepIndex(stepIndex - 1);
            } else {
                setViewMode('step1_detail');
            }
        } else if (viewMode === 'team_mode_select') {
            const selectedAutomationServices = selectedServices.filter(id => AUTOMATED_SERVICE_IDS.includes(id));
            if (selectedAutomationServices.length > 0) {
                setCurrentDetailServiceId(selectedAutomationServices[selectedAutomationServices.length - 1]);
                setViewMode('service_detail_form');
            } else {
                setViewMode('form');
                setStepIndex(STEPS.length - 1);
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
        } else if (viewMode === 'dispatch_intro') {
            setViewMode('form');
            setStepIndex(4);
        } else if (viewMode === 'step1_detail') {
            setViewMode('intro_overview');
        } else if (viewMode === 'intro_overview') {
            onClose();
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
                        stairsSize: cleaningSubServices.includes('stairs') ? stairsSize : null,
                        checklist: cleaningChecklist.filter(item => item.trim() !== ''),
                        referencePhotos: cleaningPhotos
                    } : null,
                    glassCleaningDetails: selectedServices.includes('glass_cleaning') ? {
                        windowsCount,
                        windowsSize,
                        windowsCoverage,
                        windowsAccessibility
                    } : null,
                    receptionDetails: selectedServices.includes('guest_receptionist') ? {
                        checklist: receptionChecklist.filter(item => item.trim() !== '')
                    } : null,
                    teamManagement: {
                        mode: teamMode,
                        invites: (teamMode === 'own_team' || teamMode === 'both') ? teamInvites.filter(n => n.trim() !== '') : []
                    }
                },
                createdAt: serverTimestamp(),
                status: 'active'
            });
            showToast({
                variant: 'success',
                title: t({ en: 'Listing published!', fr: 'Annonce publiée !' }),
                description: t({ en: 'Your property is now live.', fr: 'Votre propriété est maintenant en ligne.' })
            });
            setViewMode('published_success');
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
                    <button onClick={onClose} className="font-light p-2 -ml-1 rounded-full hover:bg-neutral-100 active:scale-90 transition-all" >
                        <ChevronLeft size={26} className="text-black" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 overscroll-behavior-contain">
                    <h1 className="font-medium text-[34px] text-black leading-[1.15] tracking-tight mb-8">
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
                                        <h2 className="font-medium text-[17px] text-black leading-snug tracking-tight">
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
                        className="w-full bg-[#2C2C2C] text-white py-3.5 rounded-2xl font-medium text-[17px] active:scale-[0.98] transition-all"
                    >
                        {t({ en: 'Get started', fr: 'Commencer', ar: 'ابدأ الآن' })}
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Mode: Automated Dispatch Intro ─────────────────────────────────────
    if (viewMode === 'dispatch_intro') {
        return (
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="fixed inset-0 z-[10000] bg-white flex flex-col font-plus-jakarta"
            >
                <div className="flex-1 overflow-y-auto pb-10 flex flex-col">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                        className="relative flex justify-center mb-8"
                    >
                        {/* Main dispatch illustration */}
                        <div className="w-full h-[45vh] relative overflow-hidden">
                            <Image
                                src="/Images/PropertiesListingView/image.png"
                                alt="Automated Dispatch"
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>

                        {/* Top-left property photo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.3, y: 36 }}
                            animate={{
                                opacity: [0, 1, 1, 1, 0],
                                scale: [0.3, 1.06, 1, 1, 0.3],
                                y: [36, -4, 0, 0, 36],
                            }}
                            transition={{ delay: 0, duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2, times: [0, 0.18, 0.28, 0.78, 1] }}
                            className="absolute top-[8%] left-[4%] w-[18%] aspect-square rounded-xl overflow-hidden shadow-xl border-2 border-white"
                        >
                            <Image src="/Images/PropertiesListingView/ThirdStep/ChatGPT Image Apr 25, 2026, 07_06_11 PM-Photoroom.png" alt="Property 1" fill className="object-cover" />
                        </motion.div>

                        {/* Center-right property photo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.3, y: 36 }}
                            animate={{
                                opacity: [0, 1, 1, 1, 0],
                                scale: [0.3, 1.06, 1, 1, 0.3],
                                y: [36, -4, 0, 0, 36],
                            }}
                            transition={{ delay: 1.2, duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2, times: [0, 0.18, 0.28, 0.78, 1] }}
                            className="absolute top-[35%] right-[2%] w-[18%] aspect-square rounded-xl overflow-hidden shadow-xl border-2 border-white"
                        >
                            <Image src="/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.27.png" alt="Property 2" fill className="object-cover" />
                        </motion.div>

                        {/* Bottom-right property photo */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.3, y: 36 }}
                            animate={{
                                opacity: [0, 1, 1, 1, 0],
                                scale: [0.3, 1.06, 1, 1, 0.3],
                                y: [36, -4, 0, 0, 36],
                            }}
                            transition={{ delay: 2.4, duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2, times: [0, 0.18, 0.28, 0.78, 1] }}
                            className="absolute bottom-[4%] right-[6%] w-[17%] aspect-square rounded-xl overflow-hidden shadow-xl border-2 border-white"
                        >
                            <Image src="/Images/PropertiesListingView/Screenshot 2026-04-22 at 20.04.41.png" alt="Property 3" fill className="object-cover" />
                        </motion.div>
                    </motion.div>

                    <div className="px-6">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-[32px] font-medium text-black leading-tight tracking-tight mb-4"
                        >
                            {t({
                                en: 'Automatic dispatch & Zero-management',
                                fr: 'Dispatch automatique et gestion zéro',
                                ar: 'توزيع تلقائي وإدارة صفرية'
                            })}
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="text-[18px] text-black leading-relaxed mb-6 font-light"
                        >
                            {t({
                                en: 'Lbricol Host dispatches tasks automatically to our vetted network of bricolers. We manage everything for you based on your checkout schedules—programmed in just 10 seconds after property listing.',
                                fr: 'Lbricol Host distribue automatiquement les tâches à notre réseau de bricoleurs vérifiés. Nous gérons tout pour vous selon vos départs—programmé en seulement 10 secondes.',
                                ar: 'يقوم Lbricol Host بتوزيع المهام تلقائيًا على شبكتنا من الحرفيين المعتمدين. نحن ندير كل شيء من أجلك بناءً على مواعيد المغادرة - تمت برمجتها في 10 ثوانٍ فقط.'
                            })}
                        </motion.p>
                    </div>
                </div>

                {/* Footer */}
                <div className="fixed bottom-0 left-0 right-0 px-6 pt-4 pb-6 bg-white border-t border-neutral-100 z-20">
                    {/* Segmented Progress Bar */}
                    <div className="flex gap-2 h-[2px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;
                            if (stageIdx === 0) progress = 100;
                            if (stageIdx === 1) progress = 100;
                            if (stageIdx === 2) progress = 0;

                            return (
                                <div key={stageIdx} className="flex-1 h-[2px] bg-neutral-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-black transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            className="text-[17px] font-medium text-black underline underline-offset-4"
                        >
                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('form');
                                setStepIndex(5);
                            }}
                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                        >
                            {t({ en: 'Next', fr: 'Suivant', ar: 'التالي' })}
                        </button>
                    </div>
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
                    <button onClick={handleBack} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all" >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-medium text-black cursor-default">
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
                        <span className="font-medium text-[18px] text-black">
                            {t({ en: 'Step 1', fr: 'Étape 1', ar: 'الخطوة 1' })}
                        </span>
                        <h2 className="font-medium text-[30px] text-black leading-[1.1] tracking-tight">
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
                <div className="fixed bottom-0 left-0 right-0 px-6 pt-4 pb-6 bg-white border-t border-neutral-100 z-20">
                    {/* Segmented Progress Bar */}
                    <div className="flex gap-2 h-[2px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;
                            if (stageIdx === 0) progress = 0;
                            if (stageIdx === 1) progress = 0;
                            if (stageIdx === 2) progress = 0;

                            return (
                                <div key={stageIdx} className="flex-1 h-[2px] bg-neutral-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-black transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center">
                        <button onClick={handleBack} className="font-light text-[16px] text-black underline underline-offset-4 active:scale-95 transition-all" >
                            {t({ en: 'Back', fr: 'Retour' })}
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('form');
                                setStepIndex(0);
                            }}
                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                        >
                            {t({ en: 'Next', fr: 'Suivant' })}
                        </button>
                    </div>
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
                    <button onClick={handleBack} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all" >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <div className="flex gap-2">
                        <div className="px-4 py-2 rounded-full border border-neutral-200 text-[14px] font-medium text-black cursor-default">
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
                        <span className="font-medium text-[18px] text-black">
                            {t({ en: 'Step 2', fr: 'Étape 2', ar: 'الخطوة 2' })}
                        </span>
                        <h2 className="font-medium text-[30px] text-black leading-[1.1] tracking-tight">
                            {t({
                                en: 'Make your listing stand out',
                                fr: 'Faites sortir votre annonce du lot',
                                ar: 'اجعل إعلانك متميزاً'
                            })}
                        </h2>
                        <p className="text-[17px] text-black leading-relaxed font-medium">
                            {t({
                                en: 'In this step, you can add some of the amenities offered in your accommodation and at least 5 photos. You can then add a title and a description.',
                                fr: 'À cette étape, vous pouvez ajouter certains des espaces et équipements proposés dans votre hébergement, ainsi qu\'au moins 5 photos. Vous pouvez ensuite ajouter un titre et une description.',
                                ar: 'في هذه الخطوة، يمكنك إضافة بعض المرافق المتوفرة في مسكنك و 5 صور على الأقل. يمكنك بعد ذلك إضافة عنوان ووصف.'
                            })}
                        </p>
                    </motion.div>
                </div>

                {/* Footer */}
                <div className="fixed bottom-0 left-0 right-0 px-6 pt-4 pb-6 bg-white border-t border-neutral-100 z-20">
                    {/* Segmented Progress Bar */}
                    <div className="flex gap-2 h-[2px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;
                            if (stageIdx === 0) progress = 100;
                            if (stageIdx === 1) progress = 0;
                            if (stageIdx === 2) progress = 0;

                            return (
                                <div key={stageIdx} className="flex-1 h-[2px] bg-neutral-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-black transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center">
                        <button onClick={handleBack} className="font-light text-[16px] text-black underline underline-offset-4 active:scale-95 transition-all" >
                            {t({ en: 'Back', fr: 'Retour' })}
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('form');
                                setStepIndex(3);
                            }}
                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                        >
                            {t({ en: 'Next', fr: 'Suivant' })}
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }



    // ── Mode: Published Success ───────────────────────────────────────────
    if (viewMode === 'published_success') {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[10000] bg-white flex flex-col font-plus-jakarta overflow-hidden"
            >
                {/* Top Bar */}
                <div className="px-6 pt-8 pb-4 flex justify-end items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                        <Search size={20} className="text-black" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                        <LayoutGrid size={20} className="text-black" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100">
                        <Plus size={20} className="text-black" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-6 pt-2 overflow-y-auto">
                    <h1 className="text-[32px] font-bold text-black tracking-tight mb-8">
                        {t({ en: 'Listings', fr: 'Annonces', ar: 'الإعلانات' })}
                    </h1>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
                                {t({ en: 'Published', fr: 'Publiée', ar: 'منشور' })}
                            </h2>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex gap-4 p-0"
                            >
                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-neutral-100">
                                    <Image
                                        src={photos[0] || '/Images/placeholder-property.jpg'}
                                        alt={name}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute top-1.5 left-1.5 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white shadow-sm" />
                                </div>
                                <div className="flex flex-col justify-center min-w-0 border-b border-neutral-50 flex-1 pb-4">
                                    <h3 className="font-bold text-[17px] text-black truncate tracking-tight pr-4">
                                        {name || 'Dar Lehbib | Self Check-In | Plage'}
                                    </h3>
                                    <p className="text-[14px] text-neutral-400 font-medium truncate mt-0.5">
                                        {t({ en: 'Property', fr: 'Logement' })} · {address?.split(',')[0] || 'Essaouira'}, Marrakesh-Safi
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Floating Action Button */}
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30">
                    <button className="flex items-center gap-3 bg-white px-8 py-4 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-neutral-100 active:scale-95 transition-all">
                        <span className="text-[15px] font-bold text-black">
                            {t({ en: 'Show advice', fr: 'Afficher les conseils', ar: 'إظهار النصائح' })}
                        </span>
                        <div className="w-6 h-6 bg-[#FFB700] text-white rounded-full flex items-center justify-center text-[12px] font-bold shadow-sm">
                            3
                        </div>
                    </button>
                </div>

                {/* Bottom Navigation (Lbricol Host Style) */}
                <div className="bg-white border-t border-neutral-100 pt-3 pb-8 px-4 flex justify-around items-center safe-area-bottom">
                    {/* Aujourd'hui */}
                    <div className="flex flex-col items-center gap-1 group opacity-40">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all">
                            <Zap size={22} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-medium">{t({ en: 'Today', fr: 'Aujourd\'hui' })}</span>
                    </div>

                    {/* Calendrier */}
                    <div className="flex flex-col items-center gap-1 group opacity-40">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all">
                            <Calendar size={22} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-medium">{t({ en: 'Calendar', fr: 'Calendrier' })}</span>
                    </div>

                    {/* Annonces (Active) */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 rounded-full bg-[#FFF9E5] flex items-center justify-center">
                            <Home size={22} strokeWidth={2} className="text-black" />
                        </div>
                        <span className="text-[11px] font-bold text-black">{t({ en: 'Listings', fr: 'Annonces' })}</span>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-col items-center gap-1 opacity-40">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all">
                            <MessageSquare size={22} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-medium">{t({ en: 'Messages', fr: 'Messages' })}</span>
                    </div>

                    {/* Menu */}
                    <div className="flex flex-col items-center gap-1 opacity-40">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all">
                            <User size={22} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-medium">{t({ en: 'Menu', fr: 'Menu' })}</span>
                    </div>
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
                                        <h2 className="font-medium text-[26px] text-black leading-tight tracking-tight">
                                            {t({
                                                en: 'What type of place?',
                                                fr: 'Quel type de logement?'
                                            })}
                                        </h2>
                                        <p className="text-[15px] font-light text-neutral-600 leading-snug">
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
                                                    <span className={`text-[15px] font-medium text-left leading-tight ${isActive ? 'text-black' : 'text-neutral-700'}`}>
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
                                        <h2 className="font-medium text-[27px] text-black leading-[1.1] tracking-tight">
                                            {t({
                                                en: 'Give the main information about your accommodation',
                                                fr: 'Donnez les informations principales concernant votre logement',
                                                ar: 'قدم المعلومات الأساسية عن مسكنك'
                                            })}
                                        </h2>
                                        <p className="text-[18px] text-neutral-500 font-light leading-relaxed">
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
                                        <h2 className="font-medium text-[26px] text-black leading-[1.15] tracking-tight mb-2">
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
                                                    <h3 className="font-medium text-[18px] text-black leading-tight">
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
                                                                    <span className="text-[15px] font-medium text-black leading-tight">
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
                                                <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                                    {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                                </button>
                                                <button className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                                    {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                                </button>
                                            </div>
                                            <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight">
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
                                                    <span className="text-[16px] font-light text-black">
                                                        {isUploading ? 'Chargement...' : t({ en: 'Add photos', fr: 'Ajouter des photos', ar: 'إضافة صور' })}
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="w-full p-6 rounded-xl border border-neutral-200 flex items-center justify-start gap-6 active:scale-[0.98] transition-all hover:bg-neutral-50 disabled:opacity-50"
                                                >
                                                    <Camera className="text-black shrink-0" size={24} strokeWidth={1.5} />
                                                    <span className="text-[16px] font-light text-black">
                                                        {isUploading ? 'Chargement...' : t({ en: 'Take new photos', fr: 'Prendre de nouvelles photos', ar: 'التقاط صور جديدة' })}
                                                    </span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight">Vos photos</h2>
                                                    <p className="text-[17px] text-neutral-500 font-light mt-1">Faites glisser pour réorganiser</p>
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
                                                            <div className="absolute top-3 left-3 bg-white px-3 py-1.5 rounded-lg text-[13px] font-medium shadow-sm">
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
                                                        <h3 className="font-medium text-[20px] text-black mb-2 max-w-[85%] leading-tight">Commencez avec vos plus belles photos</h3>
                                                        <p className="text-[15px] text-neutral-500 mb-4 leading-relaxed pr-2">Triez instantanément vos photos pour que les meilleures apparaissent en premier.</p>
                                                        <button
                                                            onClick={() => setShowPhotoAdvice(false)}
                                                            className="text-[16px] font-medium text-black underline underline-offset-4"
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
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                        <button className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                        </button>
                                    </div>
                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mt-4">
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
                                                className="text-[17px] text-black font-light leading-relaxed"
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
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${isSelected
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 hover:border-black'
                                                        }`}
                                                >
                                                    <Icon size={18} className="text-black" />
                                                    <span className="text-[14px] font-semibold text-black">
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
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                        <button className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                        </button>
                                    </div>
                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mt-4">
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
                                                className="text-[17px] text-black font-light leading-relaxed"
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
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${isSelected
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 hover:border-black'
                                                        }`}
                                                >
                                                    <Icon size={18} className="text-black" />
                                                    <span className="text-[14px] font-semibold text-black">
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
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                        <button className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] text-black hover:bg-neutral-50 active:scale-95 transition-all">
                                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                                        </button>
                                    </div>
                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mt-4">
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
                                                className="text-[17px] text-black font-light leading-relaxed"
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
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${isSelected
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 hover:border-black'
                                                        }`}
                                                >
                                                    <Icon size={18} className="text-black" />
                                                    <span className="text-[14px] font-semibold text-black">
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
                                <div className="flex-1 overflow-y-auto  pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="font-medium text-[32px] text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Tell us more about your cleaning needs`,
                                            fr: `Dites-nous en plus sur vos besoins en nettoyage`,
                                            ar: `أخبرنا المزيد عن احتياجات التنظيف الخاصة بك`
                                        })}
                                    </h2>

                                    {/* Sub-services Selection */}
                                    <div className="space-y-4 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'What type of cleaning do you need?', fr: 'Quel type de nettoyage avez-vous besoin ?' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'hospitality', label: 'Post-checkout cleaning', labelFr: 'Nettoyage post-checkout' },
                                                { id: 'deep', label: 'Deep cleaning', labelFr: 'Nettoyage en profondeur' },
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
                                                        className={`px-4 py-2 rounded-full border transition-all text-[14px] font-semibold ${isSubSelected
                                                            ? 'bg-neutral-50 text-black border-black border-2'
                                                            : 'bg-white text-black border-neutral-200 hover:border-black'
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
                                            className="space-y-6 mb-12 p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
                                        >
                                            <h4 className="font-medium text-[18px] text-black leading-snug">
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
                                                        className="px-5 py-3 rounded-2xl bg-white border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-black text-[17px] font-medium shadow-sm transition-all"
                                                    />
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
                                                            className={`px-4 py-2 rounded-full border text-[14px] font-semibold transition-all ${cleaningFrequencies[subId] === freq.id
                                                                ? 'bg-neutral-50 text-black border-black border-2'
                                                                : 'bg-white text-black border-neutral-200 hover:border-black'
                                                                }`}
                                                        >
                                                            {t({ en: freq.en, fr: freq.fr })}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {subId === 'stairs' && (
                                                <div className="space-y-4 pt-6 border-t border-neutral-100 mt-6">
                                                    <h5 className="font-medium text-[16px] text-black mb-4">
                                                        {t({ en: 'What is the size of the stairs?', fr: 'Quelle est la taille des escaliers ?' })}
                                                    </h5>
                                                    <div className="flex flex-wrap gap-3">
                                                        {[
                                                            { id: 'small', en: 'Small', fr: 'Petits' },
                                                            { id: 'medium', en: 'Medium', fr: 'Moyens' },
                                                            { id: 'big', en: 'Big', fr: 'Grands' }
                                                        ].map(size => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setStairsSize(size.id as any)}
                                                                className={`px-4 py-2 rounded-full border text-[14px] font-semibold transition-all ${stairsSize === size.id
                                                                    ? 'bg-neutral-50 text-black border-black border-2'
                                                                    : 'bg-white text-black border-neutral-200 hover:border-black'
                                                                    }`}
                                                            >
                                                                {t({ en: size.en, fr: size.fr })}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}

                                    {/* Checklist */}
                                    {cleaningSubServices.length > 0 && (
                                        <div className="space-y-4 mb-10">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Specific instructions / Checklist', fr: 'Instructions spécifiques / Checklist' })}
                                            </h3>
                                            <p className="text-[15px] text-neutral-500 leading-relaxed mb-4">
                                                {t({
                                                    en: 'Write down what you want the bricolers to follow during their service.',
                                                    fr: 'Notez ce que vous voulez que les bricoleurs suivent pendant leur service.'
                                                })}
                                            </p>
                                            <div className="space-y-4">
                                                {cleaningChecklist.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-4 group">
                                                        <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-300'}`}>
                                                            {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                        </div>
                                                        <div className="flex-1 relative">
                                                            <input
                                                                type="text"
                                                                value={item}
                                                                autoFocus={idx === cleaningChecklist.length - 1 && idx > 0}
                                                                onChange={(e) => {
                                                                    const newChecklist = [...cleaningChecklist];
                                                                    newChecklist[idx] = e.target.value;
                                                                    setCleaningChecklist(newChecklist);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && item.trim() !== '') {
                                                                        e.preventDefault();
                                                                        setCleaningChecklist(prev => [...prev, '']);
                                                                    } else if (e.key === 'Backspace' && item === '' && cleaningChecklist.length > 1) {
                                                                        e.preventDefault();
                                                                        const newChecklist = cleaningChecklist.filter((_, i) => i !== idx);
                                                                        setCleaningChecklist(newChecklist);
                                                                        // Focus previous input if possible? 
                                                                        // For now just removing is fine as React will re-render
                                                                    }
                                                                }}
                                                                placeholder={idx === 0 ? t({ en: 'e.g., Wash the terrace...', fr: 'ex: Laver la terrasse...' }) : ''}
                                                                className="w-full py-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300"
                                                            />
                                                            {cleaningChecklist.length > 1 && (
                                                                <button
                                                                    onClick={() => setCleaningChecklist(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-neutral-400 hover:text-red-500"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                        </div>
                                    )}

                                    {/* Reference Photos */}
                                    {cleaningSubServices.length > 0 && (
                                        <div className="space-y-4 mb-10">
                                            <h3 className="font-medium text-[18px] text-black">
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
                                                            <span className="text-[13px] font-medium text-neutral-500 group-hover:text-black transition-colors">
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

                            {currentDetailServiceId === 'glass_cleaning' && (
                                <div className="flex-1 overflow-y-auto pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Tell us about your windows`,
                                            fr: `Parlez-nous de vos vitres`,
                                            ar: `أخبرنا عن نوافذك`
                                        })}
                                    </h2>

                                    {/* Windows Count */}
                                    <div className="space-y-6 mb-10">
                                        <CounterRow
                                            label={t({ en: 'How many windows?', fr: 'Combien de fenêtres ?' })}
                                            value={windowsCount}
                                            onChange={setWindowsCount}
                                            min={1}
                                        />
                                    </div>

                                    {/* Windows Size */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'The size of majority of windows', fr: 'La taille de la majorité des vitres' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'small', label: 'Small', labelFr: 'Petites' },
                                                { id: 'medium', label: 'Medium', labelFr: 'Moyennes' },
                                                { id: 'big', label: 'Big', labelFr: 'Grandes' }
                                            ].map(size => (
                                                <button
                                                    key={size.id}
                                                    onClick={() => setWindowsSize(size.id as any)}
                                                    className={`px-4 py-2 rounded-full border transition-all text-[14px] font-semibold ${windowsSize === size.id ? 'border-black border-[1.5px] bg-[#F7F7F7] text-black' : 'border-neutral-200 text-black hover:border-black'
                                                        }`}
                                                >
                                                    {t({ en: size.label, fr: size.labelFr })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Coverage */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Coverage', fr: 'Couverture' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'interior', label: 'Interior', labelFr: 'Intérieur' },
                                                { id: 'exterior', label: 'Exterior', labelFr: 'Extérieur' },
                                                { id: 'both', label: 'Both', labelFr: 'Les deux' }
                                            ].map(cov => (
                                                <button
                                                    key={cov.id}
                                                    onClick={() => setWindowsCoverage(cov.id as any)}
                                                    className={`px-4 py-2 rounded-full border transition-all text-[14px] font-semibold ${windowsCoverage === cov.id ? 'border-black border-[1.5px] bg-[#F7F7F7] text-black' : 'border-neutral-200 text-black hover:border-black'
                                                        }`}
                                                >
                                                    {t({ en: cov.label, fr: cov.labelFr })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Accessibility */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Accessibility?', fr: 'Accessibilité ?' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'ground', label: 'Ground level', labelFr: 'Rez-de-chaussée' },
                                                { id: 'ladder', label: 'Ladder needed', labelFr: 'Échelle nécessaire' }
                                            ].map(acc => (
                                                <button
                                                    key={acc.id}
                                                    onClick={() => setWindowsAccessibility(acc.id as any)}
                                                    className={`px-4 py-2 rounded-full border transition-all text-[14px] font-semibold ${windowsAccessibility === acc.id ? 'border-black border-[1.5px] bg-[#F7F7F7] text-black' : 'border-neutral-200 text-black hover:border-black'
                                                        }`}
                                                >
                                                    {t({ en: acc.label, fr: acc.labelFr })}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentDetailServiceId === 'gardening' && (
                                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="font-medium text-[32px] text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Tell us about your garden`,
                                            fr: `Parlez-nous de votre jardin`,
                                            ar: `أخبرنا عن حديقتك`
                                        })}
                                    </h2>

                                    <div className="space-y-4 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'What gardening activities do you want?', fr: 'Quelles activités de jardinage souhaitez-vous ?' })}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { id: 'lawn_mowing', label: 'Lawn mowing', labelFr: 'Tonte de pelouse' },
                                                { id: 'trimming', label: 'Branch and hedge trimming', labelFr: 'Taille des branches et haies' },
                                                { id: 'watering', label: 'Watering', labelFr: 'Arrosage' },
                                                { id: 'landscaping', label: 'Planting and landscaping', labelFr: 'Plantation et aménagement' },
                                                { id: 'cleanup', label: 'Garden cleanup', labelFr: 'Nettoyage de jardin' }
                                            ].map(service => (
                                                <button
                                                    key={service.id}
                                                    onClick={() => {
                                                        if (gardeningSubServices.includes(service.id)) {
                                                            setGardeningSubServices(gardeningSubServices.filter(s => s !== service.id));
                                                        } else {
                                                            setGardeningSubServices([...gardeningSubServices, service.id]);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${gardeningSubServices.includes(service.id)
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 hover:border-black bg-white'
                                                        }`}
                                                >
                                                    <span className="text-[17px] font-light text-black">{t({ en: service.label, fr: service.labelFr })}</span>
                                                    {gardeningSubServices.includes(service.id) && <Check size={20} className="text-black" strokeWidth={2.5} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Lawn Mowing Details */}
                                    {gardeningSubServices.includes('lawn_mowing') && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-8 mb-12 p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
                                        >
                                            <h4 className="font-medium text-[20px] text-black border-b border-neutral-100 pb-4 mb-4 flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                {t({ en: 'Lawn Mowing Details', fr: 'Détails de la tonte' })}
                                            </h4>

                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[17px] text-black">
                                                    {t({ en: 'How big is your garden?', fr: 'Quelle est la taille de votre jardin ?' })}
                                                </h3>
                                                <div className="flex flex-wrap gap-3">
                                                    {[
                                                        { id: 'small', label: 'Small', fr: 'Petit' },
                                                        { id: 'medium', label: 'Medium', fr: 'Moyen' },
                                                        { id: 'large', label: 'Large', fr: 'Grand' },
                                                        { id: 'estate', label: 'Estate', fr: 'Domaine' }
                                                    ].map(size => (
                                                        <button
                                                            key={size.id}
                                                            onClick={() => setGardenSize(size.id as any)}
                                                            className={`px-4 py-2 rounded-full border text-[14px] font-semibold transition-all ${gardenSize === size.id
                                                                ? 'bg-neutral-50 text-black border-black border-2'
                                                                : 'border-neutral-200 text-black hover:border-black bg-white'
                                                                }`}
                                                        >
                                                            {t({ en: size.label, fr: size.fr })}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-start justify-between py-6 border-t border-neutral-50 mt-4 gap-4">
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Should the bricoler bring mower?', fr: 'Le bricoleur doit-il apporter sa tondeuse ?' })}</span>
                                                </div>
                                                <button
                                                    onClick={() => setShouldBringMower(!shouldBringMower)}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${shouldBringMower ? 'bg-black' : 'bg-neutral-200'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${shouldBringMower ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Trimming Details */}
                                    {gardeningSubServices.includes('trimming') && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="space-y-8 mb-12 p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
                                        >
                                            <h4 className="font-medium text-[20px] text-black border-b border-neutral-100 pb-4 mb-4 flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                {t({ en: 'Branch & Hedge Trimming', fr: 'Taille branches et haies' })}
                                            </h4>

                                            <CounterRow
                                                label={t({ en: 'How many trees?', fr: 'Combien d\'arbres ?' })}
                                                value={treeCount}
                                                onChange={setTreeCount}
                                                min={0}
                                            />

                                            <div className="space-y-6 pt-4">
                                                <div className="flex justify-between items-start mb-8">
                                                    <div>
                                                        <div className="font-medium text-[18px] text-black">{t({ en: 'Average Tree Height', fr: 'Hauteur moyenne' })}</div>
                                                        <div className="text-[14px] text-neutral-500 mt-1">{t({ en: 'Tip: average is 3m', fr: 'Conseil : moyenne est 3m' })}</div>
                                                    </div>
                                                    <div className="font-medium text-[22px] text-black px-6 py-4 rounded-2xl border border-neutral-300 bg-white min-w-[100px] text-center">
                                                        {averageTreeHeight}m
                                                    </div>
                                                </div>
                                                <div className="relative pt-4 pb-2">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="10"
                                                        step="0.5"
                                                        value={averageTreeHeight}
                                                        onChange={(e) => setAverageTreeHeight(parseFloat(e.target.value))}
                                                        className="w-full h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full"
                                                    />
                                                    <div className="flex justify-between mt-4 text-[14px] text-neutral-500 font-light">
                                                        <span>1m</span>
                                                        <span>10m</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[17px] text-black">
                                                    {t({ en: 'Preferred Service', fr: 'Service préféré' })}
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        { id: 'shaping', icon: '✂️', label: 'Shaping & Design', desc: 'For aesthetic looks', fr: 'Forme et Design', descFr: 'Pour l\'esthétique' },
                                                        { id: 'thinning', icon: '🍃', label: 'Thinning / Health', desc: 'Improve light & air flow', fr: 'Éclaircissage / Santé', descFr: 'Améliore la lumière et l\'air' },
                                                        { id: 'deadwood', icon: '⚠️', label: 'Deadwood / Safety', desc: 'Remove old/risky branches', fr: 'Bois mort / Sécurité', descFr: 'Retirer les branches risquées' },
                                                        { id: 'removal', icon: '🪓', label: 'Complete Removal', desc: 'Cutting tree to ground', fr: 'Retrait complet', descFr: 'Coupe au ras du sol' }
                                                    ].map(service => (
                                                        <button
                                                            key={service.id}
                                                            onClick={() => setPreferredTreeService(service.id)}
                                                            className={`flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${preferredTreeService === service.id
                                                                ? 'border-black border-2 bg-neutral-50'
                                                                : 'border-neutral-200 bg-white hover:border-black'
                                                                }`}
                                                        >
                                                            <div className="font-medium text-[28px] shrink-0">{service.icon}</div>
                                                            <div>
                                                                <div className="font-medium text-black text-[16px] mb-0.5">{t({ en: service.label, fr: service.fr })}</div>
                                                                <div className="text-[14px] text-neutral-500 font-light">{t({ en: service.desc, fr: service.descFr })}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-start justify-between pt-6 border-t border-neutral-50 gap-4">
                                                <div className="flex-1">
                                                    <span className="text-[17px] font-medium text-black leading-tight">
                                                        {t({ en: 'Is Waste Removal included?', fr: 'Évacuation des déchets incluse ?' })}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setIsWasteRemovalIncluded(!isWasteRemovalIncluded)}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${isWasteRemovalIncluded ? 'bg-black' : 'bg-neutral-200'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${isWasteRemovalIncluded ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div className="space-y-4 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'Maintenance frequency', fr: 'Fréquence de l\'entretien' })}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'week', label: 'Each week', fr: 'Chaque semaine' },
                                                { id: '2weeks', label: 'Every 2 weeks', fr: 'Toutes les 2 semaines' },
                                                { id: 'month', label: 'Each month', fr: 'Chaque mois' },
                                                { id: 'on_call', label: 'On call', fr: 'Sur demande' }
                                            ].map(freq => (
                                                <button
                                                    key={freq.id}
                                                    onClick={() => setGardeningFrequency(freq.id)}
                                                    className={`p-5 rounded-2xl border text-center transition-all ${gardeningFrequency === freq.id
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 text-black hover:border-black bg-white'
                                                        }`}
                                                >
                                                    <span className="text-[16px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Checklist */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Add any instructions (checklist)', fr: 'Ajouter des instructions (checklist)' })}
                                        </h3>
                                        <div className="space-y-2">
                                            {gardeningChecklist.map((item, idx) => (
                                                <div key={idx} className="group flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                                        {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            autoFocus={idx === gardeningChecklist.length - 1 && idx > 0}
                                                            onChange={(e) => {
                                                                const newChecklist = [...gardeningChecklist];
                                                                newChecklist[idx] = e.target.value;
                                                                setGardeningChecklist(newChecklist);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && item.trim() !== '') {
                                                                    e.preventDefault();
                                                                    setGardeningChecklist(prev => [...prev, '']);
                                                                } else if (e.key === 'Backspace' && item === '' && gardeningChecklist.length > 1) {
                                                                    e.preventDefault();
                                                                    const newChecklist = gardeningChecklist.filter((_, i) => i !== idx);
                                                                    setGardeningChecklist(newChecklist);
                                                                }
                                                            }}
                                                            placeholder={idx === 0 ? t({ en: 'e.g., Clean the pool area...', fr: 'ex: Nettoyer la zone piscine...' }) : ''}
                                                            className="w-full py-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300"
                                                        />
                                                        {gardeningChecklist.length > 1 && (
                                                            <button
                                                                onClick={() => setGardeningChecklist(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-neutral-400 hover:text-red-500"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Photos */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Add any photos', fr: 'Ajouter des photos' })}
                                        </h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {gardeningPhotos.map((p, i) => (
                                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                                                    <Image src={p} alt="Garden" fill className="object-cover" />
                                                    <button
                                                        onClick={() => setGardeningPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                                                    >
                                                        <X size={14} className="text-black" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => gardeningPhotoInputRef.current?.click()}
                                                className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-neutral-50 transition-all text-neutral-400 hover:text-black"
                                            >
                                                {isUploadingGardeningPhotos ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                                        <Plus size={24} />
                                                    </motion.div>
                                                ) : (
                                                    <>
                                                        <Plus size={24} />
                                                        <span className="text-[12px] font-medium uppercase tracking-wider">{t({ en: 'Add', fr: 'Ajouter' })}</span>
                                                    </>
                                                )}
                                            </button>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                ref={gardeningPhotoInputRef}
                                                onChange={handleGardeningPhotoUpload}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentDetailServiceId === 'pets_care' && (
                                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="font-medium text-[32px] text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Tell us more about your pets`,
                                            fr: `Dites-nous en plus sur vos animaux`,
                                            ar: `أخبرنا المزيد عن حيواناتك الأليفة`
                                        })}
                                    </h2>

                                    {/* Pet Types Selection */}
                                    <div className="space-y-4 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'What type of pets need care?', fr: 'Quel type d\'animaux a besoin de soins ?' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {[
                                                { id: 'dog', label: 'Dog', labelFr: 'Chien', icon: '🐶' },
                                                { id: 'cat', label: 'Cat', labelFr: 'Chat', icon: '🐱' },
                                                { id: 'guard_dog', label: 'Guard Dog', labelFr: 'Chien de garde', icon: '🐕' },
                                                { id: 'bird', label: 'Bird', labelFr: 'Oiseau', icon: '🦜' },
                                                { id: 'other', label: 'Other', labelFr: 'Autre', icon: '🐾' }
                                            ].map(pet => {
                                                const isSelected = petTypes.includes(pet.id);
                                                return (
                                                    <button
                                                        key={pet.id}
                                                        onClick={() => {
                                                            if (isSelected) setPetTypes(prev => prev.filter(p => p !== pet.id));
                                                            else setPetTypes(prev => [...prev, pet.id]);
                                                        }}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[14px] font-semibold ${isSelected
                                                            ? 'bg-neutral-50 text-black border-black border-2'
                                                            : 'bg-white text-black border-neutral-200 hover:border-black'
                                                            }`}
                                                    >
                                                        <span>{pet.icon}</span>
                                                        <span>{t({ en: pet.label, fr: pet.labelFr })}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {petTypes.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-10"
                                        >
                                            {/* Feeding Schedule */}
                                            <div className="p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-6">
                                                <h3 className="font-medium text-[20px] text-black">
                                                    {t({ en: 'Feeding Schedule', fr: 'Planning des repas' })}
                                                </h3>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[
                                                        { id: 'once', label: 'Once / Day', labelFr: '1 fois / jour' },
                                                        { id: 'twice', label: 'Twice / Day', labelFr: '2 fois / jour' },
                                                        { id: 'three', label: '3 times / Day', labelFr: '3 fois / jour' }
                                                    ].map(freq => (
                                                        <button
                                                            key={freq.id}
                                                            onClick={() => setPetFeedingFrequency(freq.id)}
                                                            className={`p-4 rounded-xl border text-center transition-all ${petFeedingFrequency === freq.id
                                                                ? 'border-black border-2 bg-neutral-50'
                                                                : 'border-neutral-200 text-black hover:border-black'
                                                                }`}
                                                        >
                                                            <span className="text-[14px] font-medium">{t({ en: freq.label, fr: freq.labelFr })}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Daily Needs */}
                                            <div className="p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-6">
                                                <h3 className="font-medium text-[20px] text-black">
                                                    {t({ en: 'Daily Activities & Care', fr: 'Activités et soins quotidiens' })}
                                                </h3>

                                                <div className="flex items-start justify-between py-4 border-b border-neutral-50 gap-4">
                                                    <div className="flex flex-col gap-1 flex-1">
                                                        <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Walking needed?', fr: 'Promenades nécessaires ?' })}</span>
                                                        <span className="text-[14px] text-neutral-500">{t({ en: 'For dogs and active pets', fr: 'Pour les chiens et animaux actifs' })}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setPetWalkingNeeded(!petWalkingNeeded)}
                                                        className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${petWalkingNeeded ? 'bg-black' : 'bg-neutral-200'
                                                            }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${petWalkingNeeded ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>

                                                <div className="flex items-start justify-between py-4 gap-4">
                                                    <div className="flex flex-col gap-1 flex-1">
                                                        <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Medication required?', fr: 'Médicaments requis ?' })}</span>
                                                        <span className="text-[14px] text-neutral-500">{t({ en: 'If the animal has a treatment', fr: 'Si l\'animal suit un traitement' })}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setPetMedicationNeeded(!petMedicationNeeded)}
                                                        className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${petMedicationNeeded ? 'bg-black' : 'bg-neutral-200'
                                                            }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${petMedicationNeeded ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Detailed Instructions */}
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-[18px] font-medium text-black mb-3 block">{t({ en: 'Care instructions & personality', fr: 'Instructions et personnalité' })}</label>
                                                    <textarea
                                                        value={petInstructions}
                                                        onChange={(e) => setPetInstructions(e.target.value)}
                                                        placeholder={t({ en: 'e.g. Food is in the garage, Friendly but scared of cats, Loves playing catch...', fr: 'ex: La nourriture est dans le garage, Amical mais a peur des chats, Adore jouer...' })}
                                                        className="w-full p-5 rounded-2xl bg-white border border-neutral-200 focus:ring-2 focus:ring-black focus:border-black text-[16px] min-h-[140px] resize-none transition-all shadow-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[18px] font-medium text-black mb-3 block">{t({ en: 'Emergency Contact / Vet', fr: 'Contact d\'urgence / Vétérinaire' })}</label>
                                                    <input
                                                        type="text"
                                                        value={petEmergencyContact}
                                                        onChange={(e) => setPetEmergencyContact(e.target.value)}
                                                        placeholder={t({ en: 'Name and phone number...', fr: 'Nom et numéro de téléphone...' })}
                                                        className="w-full p-5 rounded-2xl bg-white border border-neutral-200 focus:ring-2 focus:ring-black focus:border-black text-[16px] transition-all shadow-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Checklist */}
                                            <div className="space-y-4 pt-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Daily Checklist', fr: 'Checklist quotidienne' })}
                                                </h3>
                                                <div className="space-y-2">
                                                    {petChecklist.map((item, idx) => (
                                                        <div key={idx} className="group flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                                                {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            <div className="flex-1 relative">
                                                                <input
                                                                    type="text"
                                                                    value={item}
                                                                    autoFocus={idx === petChecklist.length - 1 && idx > 0}
                                                                    onChange={(e) => {
                                                                        const newChecklist = [...petChecklist];
                                                                        newChecklist[idx] = e.target.value;
                                                                        setPetChecklist(newChecklist);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && item.trim() !== '') {
                                                                            e.preventDefault();
                                                                            setPetChecklist(prev => [...prev, '']);
                                                                        } else if (e.key === 'Backspace' && item === '' && petChecklist.length > 1) {
                                                                            e.preventDefault();
                                                                            const newChecklist = petChecklist.filter((_, i) => i !== idx);
                                                                            setPetChecklist(newChecklist);
                                                                        }
                                                                    }}
                                                                    placeholder={idx === 0 ? t({ en: 'e.g., Clean the litter box...', fr: 'ex: Nettoyer la litière...' }) : ''}
                                                                    className="w-full py-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300"
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}

                            {currentDetailServiceId === 'pool_cleaning' && (
                                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="font-medium text-[32px] text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Tell us about your pool`,
                                            fr: `Parlez-nous de votre piscine`,
                                            ar: `أخبرنا عن حمام السباحة الخاص بك`
                                        })}
                                    </h2>

                                    {/* Pool Specifications */}
                                    <div className="space-y-8 mb-12">
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[20px] text-black">
                                                {t({ en: 'Pool Type', fr: 'Type de piscine' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'in_ground', label: 'In-ground', fr: 'Enterrée' },
                                                    { id: 'above_ground', label: 'Above-ground', fr: 'Hors-sol' },
                                                    { id: 'infinity', label: 'Infinity', fr: 'À débordement' },
                                                    { id: 'indoor', label: 'Indoor', fr: 'Intérieure' }
                                                ].map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => setPoolType(type.id as any)}
                                                        className={`px-4 py-2 rounded-full border text-[14px] font-semibold transition-all ${poolType === type.id
                                                            ? 'bg-neutral-50 text-black border-black border-2'
                                                            : 'border-neutral-200 text-black hover:border-black bg-white'
                                                            }`}
                                                    >
                                                        {t({ en: type.label, fr: type.fr })}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[20px] text-black">
                                                {t({ en: 'Water System', fr: 'Système d\'eau' })}
                                            </h3>
                                            <div className="flex gap-4">
                                                {[
                                                    { id: 'chlorine', label: 'Chlorine', fr: 'Chlore' },
                                                    { id: 'saltwater', label: 'Saltwater', fr: 'Au sel' }
                                                ].map(system => (
                                                    <button
                                                        key={system.id}
                                                        onClick={() => setPoolWaterType(system.id as any)}
                                                        className={`flex-1 p-5 rounded-2xl border text-center transition-all ${poolWaterType === system.id
                                                            ? 'border-black border-2 bg-neutral-50'
                                                            : 'border-neutral-200 text-black hover:border-black bg-white'
                                                            }`}
                                                    >
                                                        <span className="text-[17px] font-medium">{t({ en: system.label, fr: system.fr })}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Size & Depth */}
                                    <div className="space-y-8 mb-12">
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[20px] text-black">
                                                {t({ en: 'Pool Size', fr: 'Taille de la piscine' })}
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'small', label: 'Small', desc: '< 20m²', fr: 'Petite' },
                                                    { id: 'medium', label: 'Medium', desc: '20-50m²', fr: 'Moyenne' },
                                                    { id: 'large', label: 'Large', desc: '50-100m²', fr: 'Grande' },
                                                    { id: 'estate', label: 'Estate', desc: '> 100m²', fr: 'Domaine' }
                                                ].map(size => (
                                                    <button
                                                        key={size.id}
                                                        onClick={() => setPoolSize(size.id as any)}
                                                        className={`p-5 rounded-2xl border text-left transition-all ${poolSize === size.id
                                                            ? 'border-black border-2 bg-neutral-50'
                                                            : 'border-neutral-200 text-black hover:border-black bg-white'
                                                            }`}
                                                    >
                                                        <div className="text-[16px] font-medium mb-1">{t({ en: size.label, fr: size.fr })}</div>
                                                        <div className="text-[13px] text-neutral-500 font-light">{size.desc}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-6 pt-4">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <div className="font-medium text-[18px] text-black">{t({ en: 'Average Depth', fr: 'Profondeur moyenne' })}</div>
                                                    <div className="text-[14px] text-neutral-500 mt-1">{t({ en: 'Tip: average is 1.5m', fr: 'Conseil : moyenne est 1.5m' })}</div>
                                                </div>
                                                <div className="font-medium text-[22px] text-black px-6 py-4 rounded-2xl border border-neutral-300 bg-white min-w-[100px] text-center">
                                                    {poolDepth}m
                                                </div>
                                            </div>
                                            <div className="relative pt-4 pb-2">
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="4"
                                                    step="0.1"
                                                    value={poolDepth}
                                                    onChange={(e) => setPoolDepth(parseFloat(e.target.value))}
                                                    className="w-full h-1 bg-neutral-200 rounded-full appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full"
                                                />
                                                <div className="flex justify-between mt-4 text-[14px] text-neutral-500 font-light">
                                                    <span>0.5m</span>
                                                    <span>4m</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'Maintenance Activities', fr: 'Activités d\'entretien' })}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {[
                                                { id: 'skimming', label: 'Surface Skimming', fr: 'Nettoyage de surface' },
                                                { id: 'vacuuming', label: 'Bottom Vacuuming', fr: 'Aspiration du fond' },
                                                { id: 'brushing', label: 'Tile & Wall Brushing', fr: 'Brossage parois/carrelage' },
                                                { id: 'chemistry', label: 'Water Testing & Balancing', fr: 'Test et équilibrage de l\'eau' },
                                                { id: 'filter', label: 'Technical Maintenance (Filter/Pump)', fr: 'Entretien technique (Filtre/Pompe)' }
                                            ].map(service => (
                                                <button
                                                    key={service.id}
                                                    onClick={() => {
                                                        if (poolSubServices.includes(service.id)) {
                                                            setPoolSubServices(poolSubServices.filter(s => s !== service.id));
                                                        } else {
                                                            setPoolSubServices([...poolSubServices, service.id]);
                                                        }
                                                    }}
                                                    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${poolSubServices.includes(service.id)
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 hover:border-black bg-white'
                                                        }`}
                                                >
                                                    <span className="text-[17px] font-light text-black">{t({ en: service.label, fr: service.fr })}</span>
                                                    {poolSubServices.includes(service.id) && <Check size={20} className="text-black" strokeWidth={2.5} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Equipment & Locations */}
                                    <div className="space-y-8 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'Equipment & Access', fr: 'Équipement et Accès' })}
                                        </h3>

                                        <div className="flex items-start justify-between p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm gap-4">
                                            <div className="flex flex-col gap-1 flex-1">
                                                <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Pool Robot?', fr: 'Robot de piscine ?' })}</span>
                                                <span className="text-[14px] text-neutral-500 leading-snug">{t({ en: 'Is there an automatic cleaner?', fr: 'Y a-t-il un nettoyeur automatique ?' })}</span>
                                            </div>
                                            <button
                                                onClick={() => setPoolHasRobot(!poolHasRobot)}
                                                className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 mt-1 ${poolHasRobot ? 'bg-black' : 'bg-neutral-200'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${poolHasRobot ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-[16px] font-medium text-black mb-3 block">{t({ en: 'Where is the technical room?', fr: 'Où se trouve le local technique ?' })}</label>
                                                <textarea
                                                    value={poolTechnicalRoomLocation}
                                                    onChange={(e) => setPoolTechnicalRoomLocation(e.target.value)}
                                                    placeholder={t({ en: 'e.g. In the garage, Behind the wooden door near the pool...', fr: 'ex: Dans le garage, Derrière la porte en bois près de la piscine...' })}
                                                    className="w-full p-5 rounded-2xl bg-white border border-neutral-200 focus:ring-2 focus:ring-black focus:border-black text-[16px] min-h-[120px] resize-none transition-all shadow-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[16px] font-medium text-black mb-3 block">{t({ en: 'Where are the supplies stored?', fr: 'Où sont stockés les produits ?' })}</label>
                                                <textarea
                                                    value={poolSuppliesLocation}
                                                    onChange={(e) => setPoolSuppliesLocation(e.target.value)}
                                                    placeholder={t({ en: 'e.g. Technical room, Left shelf...', fr: 'ex: Local technique, Étagère de gauche...' })}
                                                    className="w-full p-5 rounded-2xl bg-white border border-neutral-200 focus:ring-2 focus:ring-black focus:border-black text-[16px] min-h-[100px] resize-none transition-all shadow-sm"
                                                />
                                            </div>
                                            <div className="p-6 rounded-2xl bg-neutral-50 flex gap-4 items-start border border-neutral-100">
                                                <Info size={20} className="text-black shrink-0 mt-0.5" />
                                                <p className="text-[15px] text-black leading-relaxed">
                                                    {t({
                                                        en: 'The host must provide all necessary equipment and chemical supplies for pool maintenance.',
                                                        fr: 'L\'hôte doit fournir tout l\'équipement et les produits chimiques nécessaires à l\'entretien de la piscine.'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Frequency */}
                                    <div className="space-y-4 mb-12">
                                        <h3 className="font-medium text-[20px] text-black">
                                            {t({ en: 'Maintenance frequency', fr: 'Fréquence de l\'entretien' })}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'week', label: 'Each week', fr: 'Chaque semaine' },
                                                { id: '2weeks', label: 'Every 2 weeks', fr: 'Toutes les 2 semaines' },
                                                { id: 'month', label: 'Each month', fr: 'Chaque mois' },
                                                { id: 'on_call', label: 'On call', fr: 'Sur demande' }
                                            ].map(freq => (
                                                <button
                                                    key={freq.id}
                                                    onClick={() => setPoolFrequency(freq.id)}
                                                    className={`p-5 rounded-2xl border text-center transition-all ${poolFrequency === freq.id
                                                        ? 'border-black border-2 bg-neutral-50'
                                                        : 'border-neutral-200 text-black hover:border-black bg-white'
                                                        }`}
                                                >
                                                    <span className="text-[16px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Checklist */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Additional instructions (Checklist)', fr: 'Instructions additionnelles (Checklist)' })}
                                        </h3>
                                        <div className="space-y-2">
                                            {poolChecklist.map((item, idx) => (
                                                <div key={idx} className="group flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                                        {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            autoFocus={idx === poolChecklist.length - 1 && idx > 0}
                                                            onChange={(e) => {
                                                                const newChecklist = [...poolChecklist];
                                                                newChecklist[idx] = e.target.value;
                                                                setPoolChecklist(newChecklist);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && item.trim() !== '') {
                                                                    e.preventDefault();
                                                                    setPoolChecklist(prev => [...prev, '']);
                                                                } else if (e.key === 'Backspace' && item === '' && poolChecklist.length > 1) {
                                                                    e.preventDefault();
                                                                    const newChecklist = poolChecklist.filter((_, i) => i !== idx);
                                                                    setPoolChecklist(newChecklist);
                                                                }
                                                            }}
                                                            placeholder={idx === 0 ? t({ en: 'e.g., Close the security cover...', fr: 'ex: Fermer la couverture de sécurité...' }) : ''}
                                                            className="w-full py-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300"
                                                        />
                                                        {poolChecklist.length > 1 && (
                                                            <button
                                                                onClick={() => setPoolChecklist(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-neutral-400 hover:text-red-500"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Photos */}
                                    <div className="space-y-4 mb-10">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Reference photos', fr: 'Photos de référence' })}
                                        </h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {poolPhotos.map((p, i) => (
                                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                                                    <img src={p} alt="Pool" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => setPoolPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                                                    >
                                                        <X size={14} className="text-black" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => poolPhotoInputRef.current?.click()}
                                                className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-neutral-50 transition-all text-neutral-400 hover:text-black"
                                            >
                                                {isUploadingPoolPhotos ? (
                                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                                        <Plus size={24} />
                                                    </motion.div>
                                                ) : (
                                                    <>
                                                        <Plus size={24} />
                                                        <span className="text-[12px] font-medium uppercase tracking-wider">{t({ en: 'Add', fr: 'Ajouter' })}</span>
                                                    </>
                                                )}
                                            </button>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                ref={poolPhotoInputRef}
                                                onChange={handlePoolPhotoUpload}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentDetailServiceId === 'guest_receptionist' && (
                                <div className="flex-1 overflow-y-auto pt-8 pb-32">
                                    <div className="flex flex-col items-start gap-2 pb-6">
                                        <button onClick={onClose} className="font-light px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black" >
                                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                        </button>
                                    </div>

                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mb-8">
                                        {t({
                                            en: `Guest reception instructions`,
                                            fr: `Instructions pour l'accueil`,
                                            ar: `تعليمات استقبال الضيوف`
                                        })}
                                    </h2>

                                    <div className="space-y-4">
                                        <h3 className="font-medium text-[18px] text-black">
                                            {t({ en: 'Checklist for the receptionist', fr: 'Checklist pour le réceptionniste' })}
                                        </h3>
                                        <p className="text-[15px] text-neutral-500 leading-relaxed mb-6">
                                            {t({
                                                en: 'Describe the steps from the moment they meet the guests, to the walk-in, until the end. What should and should not they do?',
                                                fr: 'Décrivez les étapes du moment où ils rencontrent les voyageurs, jusqu\'à l\'entrée dans les lieux et la fin. Que doivent-ils faire et ne pas faire ?'
                                            })}
                                        </p>

                                        <div className="space-y-4">
                                            {receptionChecklist.map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-4 group">
                                                    <div className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-300'}`}>
                                                        {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="text"
                                                            value={item}
                                                            autoFocus={idx === receptionChecklist.length - 1 && idx > 0}
                                                            onChange={(e) => {
                                                                const newChecklist = [...receptionChecklist];
                                                                newChecklist[idx] = e.target.value;
                                                                setReceptionChecklist(newChecklist);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && item.trim() !== '') {
                                                                    e.preventDefault();
                                                                    setReceptionChecklist(prev => [...prev, '']);
                                                                } else if (e.key === 'Backspace' && item === '' && receptionChecklist.length > 1) {
                                                                    e.preventDefault();
                                                                    const newChecklist = receptionChecklist.filter((_, i) => i !== idx);
                                                                    setReceptionChecklist(newChecklist);
                                                                }
                                                            }}
                                                            placeholder={idx === 0 ? t({ en: 'e.g., Meet at the main entrance, Show the kitchen...', fr: 'ex: Accueil à l\'entrée principale, Présentation de la cuisine...' }) : ''}
                                                            className="w-full py-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300"
                                                        />
                                                        {receptionChecklist.length > 1 && (
                                                            <button
                                                                onClick={() => setReceptionChecklist(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-neutral-400 hover:text-red-500"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Errands & Restocking Details */}
                            {currentDetailServiceId === 'errands' && (
                                <div className="flex-1 overflow-y-auto pb-32">
                                    <div className="px-6 pt-8 max-w-3xl mx-auto">
                                        <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mb-8">
                                            {t({ en: 'What needs restocking?', fr: 'Que faut-il réapprovisionner ?' })}
                                        </h2>

                                        <div className="space-y-12">
                                            {/* Categories */}
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Select Categories', fr: 'Sélectionnez les catégories' })}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'toiletries', icon: '🧻', label: 'Toiletries', fr: 'Articles de toilette' },
                                                        { id: 'cleaning_supplies', icon: '🧹', label: 'Cleaning Supplies', fr: 'Produits d\'entretien' },
                                                        { id: 'pantry', icon: '☕', label: 'Pantry & Breakfast', fr: 'Garde-manger & Petit-déj' },
                                                        { id: 'linens', icon: '🛏️', label: 'Linens & Towels', fr: 'Linge & Serviettes' }
                                                    ].map(category => {
                                                        const isSelected = errandsCategories.includes(category.id);
                                                        return (
                                                            <button
                                                                key={category.id}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setErrandsCategories(prev => prev.filter(id => id !== category.id));
                                                                    } else {
                                                                        setErrandsCategories(prev => [...prev, category.id]);
                                                                    }
                                                                }}
                                                                className={`flex items-center gap-3 px-5 py-4 rounded-2xl border font-light transition-all text-left ${isSelected
                                                                    ? 'border-black border-2 bg-neutral-50 text-black'
                                                                    : 'border-neutral-200 text-black hover:border-black'
                                                                    }`}
                                                            >
                                                                <span className="text-[20px]">{category.icon}</span>
                                                                <span className="text-[15px]">{t({ en: category.label, fr: category.fr })}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Dynamic Checklists for Selected Categories */}
                                            {errandsCategories.length > 0 && (
                                                <div className="space-y-8 pt-4">
                                                    {errandsCategories.map(categoryId => {
                                                        const categoryMeta = [
                                                            { id: 'toiletries', icon: '🧻', label: 'Toiletries', fr: 'Articles de toilette' },
                                                            { id: 'cleaning_supplies', icon: '🧹', label: 'Cleaning Supplies', fr: 'Produits d\'entretien' },
                                                            { id: 'pantry', icon: '☕', label: 'Pantry & Breakfast', fr: 'Garde-manger & Petit-déj' },
                                                            { id: 'linens', icon: '🛏️', label: 'Linens & Towels', fr: 'Linge & Serviettes' }
                                                        ].find(c => c.id === categoryId);

                                                        const list = errandsChecklists[categoryId] || [{ name: '', quantity: 1 }];

                                                        const updateItemName = (index: number, value: string) => {
                                                            const newList = [...list];
                                                            newList[index].name = value;
                                                            setErrandsChecklists(prev => ({ ...prev, [categoryId]: newList }));
                                                        };

                                                        const updateItemQuantity = (index: number, value: number) => {
                                                            const newList = [...list];
                                                            newList[index].quantity = value;
                                                            setErrandsChecklists(prev => ({ ...prev, [categoryId]: newList }));
                                                        };

                                                        const addItemBrand = (index: number, value: string) => {
                                                            const newList = list.map((item, i) => {
                                                                if (i !== index) return item;
                                                                const existing = item.brands || [];
                                                                if (!existing.includes(value)) return { ...item, brands: [...existing, value] };
                                                                return item;
                                                            });
                                                            setErrandsChecklists(prev => ({ ...prev, [categoryId]: newList }));
                                                        };

                                                        const removeItemBrand = (index: number, brand: string) => {
                                                            const newList = list.map((item, i) => {
                                                                if (i !== index) return item;
                                                                return { ...item, brands: (item.brands || []).filter(b => b !== brand) };
                                                            });
                                                            setErrandsChecklists(prev => ({ ...prev, [categoryId]: newList }));
                                                        };

                                                        const updateItemFrequency = (index: number, value: string) => {
                                                            const newList = [...list];
                                                            newList[index].frequency = value;
                                                            setErrandsChecklists(prev => ({ ...prev, [categoryId]: newList }));
                                                        };

                                                        const addItem = () => {
                                                            setErrandsChecklists(prev => ({
                                                                ...prev,
                                                                [categoryId]: [...list, { name: '', quantity: 1 }]
                                                            }));
                                                            setTimeout(() => {
                                                                const nextInput = document.getElementById(`errand-input-${categoryId}-${list.length}`);
                                                                if (nextInput) nextInput.focus();
                                                            }, 10);
                                                        };

                                                        const removeItem = (index: number) => {
                                                            const newList = list.filter((_, i) => i !== index);
                                                            setErrandsChecklists(prev => ({ ...prev, [categoryId]: newList }));
                                                        };

                                                        return (
                                                            <div key={categoryId} className="space-y-4">
                                                                <h3 className="font-medium text-[18px] text-black flex items-center gap-2">
                                                                    <span>{categoryMeta?.icon}</span>
                                                                    {t({ en: `${categoryMeta?.label} Items`, fr: `Articles pour ${categoryMeta?.fr}` })}
                                                                </h3>
                                                                <div className="flex flex-col">
                                                                    {list.map((item, idx) => (
                                                                        <div key={idx} className="flex flex-col gap-4 py-5 border-b border-neutral-100 group">
                                                                            <div className="flex justify-between items-start w-full gap-4">
                                                                                <div className="flex flex-col gap-3 w-full">
                                                                                    <input
                                                                                        id={`errand-input-${categoryId}-${idx}`}
                                                                                        type="text"
                                                                                        value={item.name}
                                                                                        onChange={(e) => updateItemName(idx, e.target.value)}
                                                                                        onKeyDown={(e) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                e.preventDefault();
                                                                                                addItem();
                                                                                            }
                                                                                        }}
                                                                                        placeholder={t({ en: 'Item name (Press Enter to add another)', fr: 'Nom de l\'article (Entrée pour ajouter)' })}
                                                                                        className="w-full bg-transparent border-none p-0 focus:ring-0 focus:border-transparent focus:outline-none outline-none text-[16px] text-black placeholder:text-neutral-300 font-medium"
                                                                                    />

                                                                                    {/* Brand pills row */}
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        {(item.brands || []).map(brand => (
                                                                                            <span key={brand} className="inline-flex items-center gap-1 px-3 py-1 bg-[#F7F7F7] text-neutral-600 rounded-lg text-[13px] font-medium border border-neutral-200">
                                                                                                {brand}
                                                                                                <button onClick={() => removeItemBrand(idx, brand)} className="ml-1 text-neutral-400 hover:text-black">
                                                                                                    <X size={12} />
                                                                                                </button>
                                                                                            </span>
                                                                                        ))}

                                                                                        {editingBrand?.cat === categoryId && editingBrand?.idx === idx ? (
                                                                                            <input
                                                                                                autoFocus
                                                                                                type="text"
                                                                                                placeholder={t({ en: 'Preferred brand', fr: 'Marque préférée' })}
                                                                                                className="px-3 py-1 bg-white border border-black rounded-lg text-[13px] font-medium w-[150px] focus:outline-none focus:ring-0"
                                                                                                onKeyDown={(e) => {
                                                                                                    if (e.key === 'Enter') {
                                                                                                        e.preventDefault();
                                                                                                        const val = e.currentTarget.value.trim();
                                                                                                        if (val) addItemBrand(idx, val);
                                                                                                        setEditingBrand(null);
                                                                                                    } else if (e.key === 'Escape') {
                                                                                                        setEditingBrand(null);
                                                                                                    }
                                                                                                }}
                                                                                                onBlur={(e) => {
                                                                                                    const val = e.target.value.trim();
                                                                                                    if (val) addItemBrand(idx, val);
                                                                                                    setEditingBrand(null);
                                                                                                }}
                                                                                            />
                                                                                        ) : (
                                                                                            <button
                                                                                                onClick={() => setEditingBrand({ cat: categoryId, idx })}
                                                                                                className="inline-flex items-center gap-1 px-3 py-1 text-neutral-400 hover:bg-neutral-50 rounded-lg text-[13px] font-medium border border-dashed border-neutral-300 transition-colors shrink-0"
                                                                                            >
                                                                                                <Plus size={12} />
                                                                                                {t({ en: 'Add brand', fr: 'Ajouter marque' })}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>

                                                                                <button
                                                                                    onClick={() => removeItem(idx)}
                                                                                    className={`p-2 -mr-2 transition-opacity text-neutral-300 hover:text-red-500 shrink-0 ${list.length > 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                                                                >
                                                                                    <X size={20} />
                                                                                </button>
                                                                            </div>

                                                                            <div className="flex flex-col gap-4 w-full pt-1">
                                                                                {/* Frequency Row */}
                                                                                <div className="flex items-center justify-between w-full">
                                                                                    <span className="text-[15px] font-light text-black">
                                                                                        {t({ en: 'Frequency', fr: 'Fréquence' })}
                                                                                    </span>
                                                                                    <div className="relative shrink-0">
                                                                                        <select
                                                                                            value={item.frequency || 'checkout'}
                                                                                            onChange={(e) => updateItemFrequency(idx, e.target.value)}
                                                                                            className="appearance-none pl-3 pr-8 py-1.5 bg-white text-neutral-600 rounded-lg text-[13px] font-medium border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors"
                                                                                        >
                                                                                            <option value="checkout">{t({ en: 'Every checkout', fr: 'Chaque départ' })}</option>
                                                                                            <option value="weekly">{t({ en: 'Weekly', fr: 'Hebdomadaire' })}</option>
                                                                                            <option value="monthly">{t({ en: 'Monthly', fr: 'Mensuel' })}</option>
                                                                                            <option value="on_request">{t({ en: 'On request', fr: 'Sur demande' })}</option>
                                                                                        </select>
                                                                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                                                                            <ChevronDown size={14} />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Quantity Row */}
                                                                                <div className="flex items-center justify-between w-full border-t border-neutral-50 pt-4">
                                                                                    <span className="text-[15px] font-light text-black">
                                                                                        {t({ en: 'Quantity', fr: 'Quantité' })}
                                                                                    </span>
                                                                                    <div className="flex items-center gap-4">
                                                                                        <button
                                                                                            onClick={() => updateItemQuantity(idx, Math.max(1, item.quantity - 1))}
                                                                                            disabled={item.quantity <= 1}
                                                                                            className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 text-black"
                                                                                        >
                                                                                            <div className="w-3 h-[1.5px] bg-black opacity-60" />
                                                                                        </button>
                                                                                        <span className="text-[17px] font-light w-6 text-center text-black tabular-nums">{item.quantity}</span>
                                                                                        <button
                                                                                            onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                                                                                            className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center active:scale-90 transition-all text-black"
                                                                                        >
                                                                                            <div className="relative w-3 h-3 flex items-center justify-center">
                                                                                                <div className="absolute w-3 h-[1.5px] bg-black opacity-80" />
                                                                                                <div className="absolute w-[1.5px] h-3 bg-black opacity-80" />
                                                                                            </div>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Add item button */}
                                                                <button
                                                                    onClick={addItem}
                                                                    className="mt-3 inline-flex items-center gap-2 text-[14px] text-neutral-500 hover:text-black font-medium transition-colors group/add"
                                                                >
                                                                    <span className="w-6 h-6 rounded-full border border-dashed border-neutral-300 group-hover/add:border-black flex items-center justify-center transition-colors">
                                                                        <Plus size={12} />
                                                                    </span>
                                                                    {t({ en: 'Add item', fr: 'Ajouter un article' })}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Storage Location */}
                                            <div className="mt-8 py-6 border-t border-neutral-100">
                                                <div className="flex flex-col gap-1 mb-3">
                                                    <span className="text-[17px] font-medium text-black">
                                                        {t({ en: 'Where do you store your supplies?', fr: 'Où stockez-vous vos fournitures ?' })}
                                                    </span>
                                                    <span className="text-[14px] text-neutral-400 font-light">
                                                        {t({ en: 'Help the Bricoler find and restock items in the right place.', fr: 'Aidez le Bricoleur à trouver et ranger les articles au bon endroit.' })}
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={errandsStorageLocation}
                                                    onChange={(e) => setErrandsStorageLocation(e.target.value)}
                                                    rows={3}
                                                    placeholder={t({ en: 'e.g. Toiletries in the bathroom cabinet under the sink. Cleaning products in the kitchen cupboard on the left. Linens in the wardrobe in the hallway…', fr: 'ex. Articles de toilette dans le meuble sous l\'évier. Produits ménagers dans le placard gauche de la cuisine…' })}
                                                    className="w-full resize-none bg-[#F7F7F7] rounded-2xl px-5 py-4 text-[15px] text-black placeholder:text-neutral-400 font-light focus:outline-none focus:ring-2 focus:ring-black border border-transparent focus:border-transparent transition-all leading-relaxed"
                                                />
                                            </div>

                                            {/* Billing Disclaimer */}
                                            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 mt-8">
                                                <h4 className="font-medium text-[16px] text-black mb-2">
                                                    {t({ en: 'Important Information', fr: 'Information Importante' })}
                                                </h4>
                                                <p className="text-[14px] text-neutral-600 font-light leading-relaxed">
                                                    {t({
                                                        en: 'The Errands & Restocking service covers the Bricoler\'s time and delivery effort. The actual cost of purchased items will be billed directly to you via receipt scanning.',
                                                        fr: 'Le service de Courses & Réapprovisionnement couvre le temps et l\'effort de livraison du Bricoleur. Le coût réel des articles achetés vous sera facturé directement via la numérisation des reçus.'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Generic placeholder for other services if needed */}
                            {currentDetailServiceId && !['cleaning', 'glass_cleaning', 'gardening', 'pool_cleaning', 'guest_receptionist', 'pets_care', 'errands'].includes(currentDetailServiceId) && (
                                <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32">
                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight mb-4">
                                        {t({ en: `Tell us more about ${currentDetailServiceId}`, fr: `Dites-nous en plus sur ${currentDetailServiceId}` })}
                                    </h2>
                                    <p className="text-neutral-500">
                                        {t({ en: 'Further details for this service will be added soon.', fr: 'D\'autres détails pour ce service seront ajoutés bientôt.' })}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {viewMode === 'team_mode_select' && (
                        <motion.div
                            key="team-mode-select"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="flex-1 overflow-y-auto  pt-8 pb-32">
                                <div className="space-y-2 mb-8">
                                    <h2 className="font-medium text-[26px] text-black leading-tight tracking-tight">
                                        {t({
                                            en: 'Who will handle your tasks?',
                                            fr: 'Qui s\'occupera de vos tâches ?'
                                        })}
                                    </h2>
                                    <p className="text-[15px]  text-neutral-600 leading-snug">
                                        {t({
                                            en: 'Choose how you want to manage your property services and staff.',
                                            fr: 'Choisissez comment vous souhaitez gérer les services et le personnel de votre logement.'
                                        })}
                                    </p>
                                </div>

                                {(() => {
                                    const options = [
                                        {
                                            id: 'lbricol',
                                            title: { en: 'Lbricol Bricolers', fr: 'Bricoleurs Lbricol' },
                                            desc: { en: 'We automatically dispatch vetted Bricolers. Zero management.', fr: 'Nous envoyons automatiquement des bricoleurs vérifiés. Zéro gestion.' },
                                            icon: <Bot className="text-black" size={32} strokeWidth={1.5} />
                                        },
                                        {
                                            id: 'own_team',
                                            title: { en: 'My Own Team', fr: 'Mon équipe actuelle' },
                                            desc: { en: 'Invite your staff and manage them through the app.', fr: 'Invitez votre personnel et gérez-les via l\'application.' },
                                            icon: <Home className="text-black" size={32} strokeWidth={1.5} />
                                        },
                                        {
                                            id: 'both',
                                            title: { en: 'Both', fr: 'Les deux' },
                                            desc: { en: 'Your team handles regulars, Bricolers fill any gaps.', fr: 'Votre équipe gère les habitués, les bricoleurs comblent les lacunes.' },
                                            icon: <Handshake className="text-black" size={32} strokeWidth={1.5} />
                                        },
                                    ];

                                    return (
                                        <div className="space-y-4">
                                            {options.map((option) => {
                                                const isActive = teamMode === option.id;
                                                return (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => setTeamMode(option.id as any)}
                                                        className={`w-full flex items-center justify-between p-6 rounded-2xl border transition-all text-left ${isActive ? 'border-black border-2 bg-neutral-50 ring-1 ring-black' : 'border-neutral-200 hover:border-black'}`}
                                                    >
                                                        <div className="flex flex-col gap-1 pr-4">
                                                            <span className="font-semibold text-[18px] text-black tracking-tight">{t(option.title)}</span>
                                                            <span className="text-[14px] text-neutral-500 font-medium leading-snug">{t(option.desc)}</span>
                                                        </div>
                                                        <div className="shrink-0 ml-4 opacity-80">
                                                            {option.icon}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {(teamMode === 'own_team' || teamMode === 'both') && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4 pt-0 pb-12"
                                >
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-[22px] text-black tracking-tight">
                                            {t({ en: 'Share activity codes', fr: 'Partagez les codes d\'activité' })}
                                        </h3>
                                        <p className="text-[15px] text-neutral-500 font-light">
                                            {t({
                                                en: 'Give these codes to your team. They can use them to create a Bricoler account linked to this property and specific tasks.',
                                                fr: 'Donnez ces codes à votre équipe. Ils pourront les utiliser pour créer un compte Bricoler lié à ce logement et à des tâches spécifiques.'
                                            })}
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {Object.entries(serviceCodes).map(([serviceId, code]) => {
                                            const service = SERVICES_CATALOGUE.find(s => s.id === serviceId);
                                            return (
                                                <div key={serviceId} className="flex items-center justify-between p-5 bg-[#FFFFFF] rounded-[20px] border border-neutral-100 group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            {service?.id === 'cleaning' ? <Sparkles size={22} strokeWidth={1.5} /> :
                                                                service?.id === 'guest_receptionist' ? <Key size={22} strokeWidth={1.5} /> :
                                                                    service?.id === 'gardening' ? <Flower2 size={22} strokeWidth={1.5} /> :
                                                                        <Bot size={22} strokeWidth={1.5} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[15px] font-medium text-black">{t({ en: service?.label || serviceId, fr: service?.labelFr || serviceId })}</span>
                                                            <span className="text-[13px] text-neutral-400 font-mono tracking-wider">{code}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(code);
                                                            showToast({
                                                                variant: 'success',
                                                                title: t({ en: 'Copied!', fr: 'Copié !' }),
                                                                description: t({ en: 'Code copied to clipboard.', fr: 'Code copié dans le presse-papier.' })
                                                            });
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-[13px] font-medium hover:border-black active:scale-95 transition-all"
                                                    >
                                                        <Copy size={14} />
                                                        {t({ en: 'Copy', fr: 'Copier' })}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-4 space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-[16px] font-medium text-black">
                                                {t({ en: 'Direct invites (Optional)', fr: 'Invitations directes (Optionnel)' })}
                                            </h4>
                                            <p className="text-[14px] text-neutral-400 font-light">
                                                {t({ en: 'We can also notify them via SMS.', fr: 'Nous pouvons aussi les avertir par SMS.' })}
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {teamInvites.map((invite, idx) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="tel"
                                                            value={invite}
                                                            onChange={(e) => {
                                                                const newInvites = [...teamInvites];
                                                                newInvites[idx] = e.target.value;
                                                                setTeamInvites(newInvites);
                                                            }}
                                                            placeholder="+212 6..."
                                                            className="w-full bg-[#F7F7F7] rounded-xl px-4 py-3 text-[15px] font-light border border-transparent focus:border-black focus:bg-white transition-all outline-none"
                                                        />
                                                    </div>
                                                    {teamInvites.length > 1 && (
                                                        <button
                                                            onClick={() => setTeamInvites(teamInvites.filter((_, i) => i !== idx))}
                                                            className="p-2 text-neutral-400 hover:text-black transition-colors"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                onClick={() => setTeamInvites([...teamInvites, ''])}
                                                className="flex items-center gap-2 text-[14px] font-medium text-black hover:opacity-70 transition-opacity pt-2"
                                            >
                                                <Plus size={18} />
                                                {t({ en: 'Add another person', fr: 'Ajouter une autre personne' })}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            {stepIndex !== 1 && (
                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20">
                    {/* Segmented Progress Bar */}
                    <div className="flex gap-2 h-[2px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;

                            // Calculate progress for each stage
                            if (stageIdx === 0) {
                                if (stepIndex > 2) progress = 100;
                                else if (stepIndex === 0) progress = 33;
                                else if (stepIndex === 1) progress = 66;
                                else if (stepIndex === 2) progress = 100;
                            } else if (stageIdx === 1) {
                                if (stepIndex > 4) progress = 100;
                                else if (stepIndex === 3) progress = 50;
                                else if (stepIndex === 4) progress = 100;
                            } else if (stageIdx === 2) {
                                if ((viewMode as string) === 'published_success') progress = 100;
                                else if (stepIndex === 5) progress = 33;
                                else if (stepIndex === 6) progress = 66;
                                else if (stepIndex >= 7 || (viewMode as string) === 'team_mode_select' || (viewMode as string) === 'service_detail_form') progress = 100;
                            }

                            return (
                                <div key={stageIdx} className="flex-1 h-[2px] bg-neutral-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-black transition-all duration-500 ease-in-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center">
                        <button onClick={handleBack} className="font-light text-[17px] text-black underline underline-offset-4" >
                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting || (viewMode === 'team_mode_select' && !teamMode)}
                            className="bg-[#2C2C2C] disabled:bg-neutral-200 text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                        >
                            {(() => {
                                if (isSubmitting) return 'Publication...';
                                if (viewMode === 'team_mode_select') return 'Publier l\'annonce';
                                return 'Suivant';
                            })()}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertySetupWizard;
