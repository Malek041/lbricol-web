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
    Bot, Handshake, Copy, Flower2, LayoutGrid, MessageSquare, Calendar, Bookmark, Menu, User, CheckCircle2, FireExtinguisher, ShieldAlert, QrCode,
    Layers, ArrowUpDown
} from 'lucide-react';
import { TbGrill, TbCampfire, TbAlarmSmoke, TbBuildingSkyscraper, TbBuildingEstate, TbBuildingCottage, TbBuildingMosque } from 'react-icons/tb';
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
import WaveTop from '@/components/shared/WaveTop';

interface PropertySetupWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (property?: any) => void;
}

const FAQ_SERVICES = [
    {
        title: "Nettoyage",
        content: "L'activité la plus fréquente et critique. Après chaque départ (checkout), l'application dépêche automatiquement un agent de nettoyage à l'heure prévue. L'agent suit une liste de tâches définie par l'hôte (changement des draps, reset de la salle de bain, nettoyage de la cuisine, etc.) et télécharge des photos de preuve pièce par pièce. L'hôte reçoit une notification \"Nettoyage terminé ✓\" avec les photos. Aucune intervention n'est nécessaire sauf si l'agent signale un problème."
    },
    {
        title: "Nettoyage de vitres",
        content: "Moins fréquent et non lié à chaque checkout. Cette activité suit un calendrier défini par l'hôte (toutes les 2 semaines, mensuel, etc.) ou peut être déclenchée manuellement. L'agent doit connaître le nombre de fenêtres, si c'est intérieur/extérieur, si une échelle est nécessaire et l'étage. L'algorithme trouve un Bricoleur ayant spécifiquement la compétence \"Nettoyage de vitres\"."
    },
    {
        title: "Accueil Voyageurs",
        content: "Déclenché à chaque arrivée (check-in). Un réceptionniste Bricoleur (ou un membre de votre équipe) se rend à la propriété à l'heure du check-in, accueille les voyageurs, remet les clés, fait un tour rapide du logement et valide la remise des clés dans l'application. L'hôte définit lors de la configuration : emplacement des clés/code du boitier, instructions d'accueil, points spécifiques à expliquer. C'est l'activité la plus sensible au temps : si le Bricoleur est en retard ou indisponible, l'hôte est immédiatement averti."
    },
    {
        title: "Jardinage",
        content: "Basé sur un calendrier et non sur des événements voyageurs. L'hôte définit la fréquence (hebdomadaire, bimensuelle, mensuelle) et les tâches spécifiques (tonte de pelouse, taille de haies, arrosage, etc.). Un jardinier est dépêché le jour prévu et télécharge des photos avant/après."
    },
    {
        title: "Nettoyage de piscine",
        content: "Également basé sur un calendrier. L'hôte définit la fréquence, le type de piscine (intérieure/extérieure), le système de traitement (chlore/sel), la taille et l'emplacement du local technique et des fournitures. Le Bricoleur a besoin de tout cela : équilibre chimique, passage de l'aspirateur, vérification du filtre. Photos de la clarté de l'eau et des niveaux chimiques à la fin."
    },
    {
        title: "Soins des animaux",
        content: "L'activité la plus délicate. Peut être quotidienne ou sur mesure. L'hôte définit : type et nom de l'animal, horaires et quantités de nourriture, besoins de promenade, médicaments éventuels et contact du vétérinaire d'urgence. Le Bricoleur doit avoir la compétence \"Soins des animaux\". L'hôte peut désigner un Bricoleur préféré pour assurer une continuité et une confiance."
    },
    {
        title: "Courses (Restockage)",
        content: "Le flux le plus complet. L'agent de nettoyage déclenche indirectement le besoin en notant les stocks restants après son passage. L'application compare ces données aux seuils définis par l'hôte et dépêche automatiquement un coursier si nécessaire. L'hôte définit : catégories d'articles, marques préférées, seuils d'alerte, budget maximum et mode d'approbation (auto ou manuel)."
    }
];

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
        title: { en: 'Do you have any standout amenities?', fr: 'Possédez-vous des espaces uniques ?' },
        items: [
            { id: 'garden', label: { en: 'Garden', fr: 'Jardin' }, icon: TreePine },
            { id: 'pool', label: { en: 'Pool', fr: 'Piscine' }, icon: Waves },
            { id: 'pets_place', label: { en: 'Place for pets', fr: 'Espace pour animaux' }, icon: PawPrint },
            { id: 'kids_space', label: { en: 'Kids space', fr: 'Espace enfants' }, icon: Baby },
            { id: 'hottub', label: { en: 'Hot tub', fr: 'Jacuzzi' }, icon: Bath },
            { id: 'patio', label: { en: 'Patio', fr: 'Patio' }, icon: Fence },
            { id: 'bbq', label: { en: 'BBQ grill', fr: 'Barbecue' }, icon: TbGrill },
            { id: 'outdoor_dining', label: { en: 'Outdoor dining area', fr: 'Espace repas en plein air' }, icon: Utensils },
            { id: 'pool_table', label: { en: 'Pool table', fr: 'Table de billard' }, icon: Dices },
            { id: 'fireplace', label: { en: 'Indoor fireplace', fr: 'Cheminée intérieure' }, icon: Flame },
            { id: 'piano', label: { en: 'Piano', fr: 'Piano' }, icon: Music },
            { id: 'gym', label: { en: 'Exercise equipment', fr: 'Équipement d\'exercice' }, icon: Dumbbell },
            { id: 'outdoor_shower', label: { en: 'Outdoor shower', fr: 'Douche extérieure' }, icon: ShowerHead },
            { id: 'fire_pit', label: { en: 'Fire pit', fr: 'Brasero' }, icon: TbCampfire },
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
    { id: 'apartment', label: { en: 'Apartment', fr: 'Appartement' }, icon: Home },
    { id: 'villa', label: { en: 'Villa', fr: 'Villa' }, icon: TbBuildingEstate },
    { id: 'guesthouse', label: { en: 'Guesthouse', fr: 'Maison d\'hôtes/Gîte rural' }, icon: TbBuildingCottage },
    { id: 'hotel', label: { en: 'Hotel', fr: 'Hôtel' }, icon: HotelIcon },
    { id: 'riad', label: { en: 'Riad', fr: 'Riad' }, icon: TbBuildingMosque },
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

const CounterRow = ({ label, value, onChange, min = 0, max = Infinity, py = "py-3" }: { label: string; value: number; onChange: (val: number) => void; min?: number; max?: number; py?: string }) => (
    <div className={`flex justify-between items-center ${py}`}>
        {label && <span className="font-medium text-[18px] text-black pr-4">{label}</span>}
        <div className="flex items-center gap-4 shrink-0">
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                disabled={value <= min}
                className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 text-black"
            >
                <div className="w-3 h-[1.5px] bg-black opacity-60" />
            </button>
            <span className="text-[17px] font-light w-6 text-center text-black tabular-nums">{value}</span>
            <button
                onClick={() => onChange(Math.min(max, value + 1))}
                disabled={value >= max}
                className="w-8 h-8 rounded-full bg-[#F7F7F7] flex items-center justify-center active:scale-90 transition-all disabled:opacity-20 text-black"
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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);
    const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
    const [currentDetailServiceId, setCurrentDetailServiceId] = useState<string | null>(null);
    const [teamMode, setTeamMode] = useState<'lbricol' | 'own_team' | 'both' | null>(null);
    const [teamInvites, setTeamInvites] = useState<string[]>(['']);
    const [propertyCode, setPropertyCode] = useState<string | null>(null);

    // Cleaning Details State
    const [cleaningSubServices, setCleaningSubServices] = useState<string[]>([]);
    const [cleaningFrequencies, setCleaningFrequencies] = useState<Record<string, string>>({});
    const [cleaningChecklist, setCleaningChecklist] = useState<string[]>(['']);
    const [cleaningPhotos, setCleaningPhotos] = useState<string[]>([]);
    const [isUploadingCleaningPhotos, setIsUploadingCleaningPhotos] = useState(false);
    const [stairsSize, setStairsSize] = useState<number>(1);
    const cleaningPhotoInputRef = useRef<HTMLInputElement>(null);
    const [activeServiceInfo, setActiveServiceInfo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);



    // Glass Cleaning Details State
    const [windowsCount, setWindowsCount] = useState(1);
    const [windowsSize, setWindowsSize] = useState<'small' | 'medium' | 'big'>('medium');
    const [windowsCoverage, setWindowsCoverage] = useState<'interior' | 'exterior' | 'both'>('both');
    const [windowsAccessibility, setWindowsAccessibility] = useState<'ground' | 'ladder' | 'high'>('ground');
    const [glassCleaningPhotos, setGlassCleaningPhotos] = useState<string[]>([]);
    const [glassCleaningChecklist, setGlassCleaningChecklist] = useState<string[]>(['']);
    const [isUploadingGlassPhotos, setIsUploadingGlassPhotos] = useState(false);

    // Receptionist Details State
    const [receptionChecklist, setReceptionChecklist] = useState<string[]>(['']);
    const [receptionCheckInMethod, setReceptionCheckInMethod] = useState<string>('in_person');
    const [receptionPhoneSupport, setReceptionPhoneSupport] = useState<boolean>(true);

    // Gardening Details State
    const [gardeningSubServices, setGardeningSubServices] = useState<string[]>([]);
    const [gardenSize, setGardenSize] = useState<'small' | 'medium' | 'big' | 'bigger'>('medium');
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
    const [petPreferredBricoler, setPetPreferredBricoler] = useState('');
    const [petDetails, setPetDetails] = useState<Record<string, { name: string; feedingFrequency: string; walkingNeeded: boolean; medicationRequired: boolean; checklist: string[] }>>({});

    // Errands & Restocking State
    const [errandsCategories, setErrandsCategories] = useState<string[]>([]);
    const [errandsChecklists, setErrandsChecklists] = useState<Record<string, { name: string, quantity: number, brands?: string[], frequency?: string }[]>>({});
    const [editingBrand, setEditingBrand] = useState<{ cat: string, idx: number } | null>(null);
    const [errandsInstructions, setErrandsInstructions] = useState('');
    const [errandsFrequency, setErrandsFrequency] = useState('post_checkout');
    const [errandsStorageLocation, setErrandsStorageLocation] = useState('');
    const [errandsPreferredSupplier, setErrandsPreferredSupplier] = useState('');
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

    const anyIsUploading = isUploading || isUploadingCleaningPhotos || isUploadingGardeningPhotos || isUploadingPoolPhotos;

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter((s: any) => s !== id) : [...prev, id]
        );
    };

    useEffect(() => {
        if (viewMode === 'team_mode_select' && (teamMode === 'own_team' || teamMode === 'both')) {
            if (!propertyCode) {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                setPropertyCode(code);
            }
        }
    }, [viewMode, teamMode]);

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
        setPhotos(prev => prev.filter((_: any, i: number) => i !== idx));
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
                const selectedAutomationServices = selectedServices.filter((id: any) => AUTOMATED_SERVICE_IDS.includes(id));
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
            const selectedAutomationServices = selectedServices.filter((id: any) => AUTOMATED_SERVICE_IDS.includes(id));
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
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }, [stepIndex, viewMode, currentDetailServiceId]);

    useEffect(() => {
        setActiveServiceInfo(null);
    }, [stepIndex]);

    const handleSaveAndExit = () => {
        showToast({
            title: t({
                en: 'Progress saved successfully',
                fr: 'Progrès enregistré avec succès',
                ar: 'تم حفظ التقدم بنجاح'
            }),
            variant: 'success'
        });
        onClose();
    };

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
            const selectedAutomationServices = selectedServices.filter((id: any) => AUTOMATED_SERVICE_IDS.includes(id));
            if (selectedAutomationServices.length > 0) {
                setCurrentDetailServiceId(selectedAutomationServices[selectedAutomationServices.length - 1]);
                setViewMode('service_detail_form');
            } else {
                setViewMode('form');
                setStepIndex(STEPS.length - 1);
            }
        } else if (viewMode === 'service_detail_form') {
            const selectedAutomationServices = selectedServices.filter((id: any) => AUTOMATED_SERVICE_IDS.includes(id));
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
        if (!auth.currentUser || isSubmitting || anyIsUploading) return;
        setIsSubmitting(true);
        try {
            // Final safety filter: remove any temporary blob URLs
            const finalPhotos = photos.filter((p: any) => p && !p.startsWith('blob:'));
            const finalCleaningPhotos = cleaningPhotos.filter((p: any) => p && !p.startsWith('blob:'));
            const finalGardeningPhotos = gardeningPhotos.filter((p: any) => p && !p.startsWith('blob:'));
            const finalPoolPhotos = poolPhotos.filter((p: any) => p && !p.startsWith('blob:'));
            const finalGlassCleaningPhotos = glassCleaningPhotos.filter((p: any) => p && !p.startsWith('blob:'));

            const docRef = await addDoc(collection(db, 'properties'), {
                hostId: auth.currentUser.uid,
                name: name || `${type} à ${auth.currentUser.displayName}`,
                type,
                coverPhoto: finalPhotos[0] || null,
                photos: finalPhotos,
                propertyCode: propertyCode,
                specs: {
                    bedrooms: Number(bedrooms),
                    floor: Number(floor),
                    guests: Number(guests),
                    beds: Number(beds),
                    bathrooms: Number(bathrooms),
                    apartmentNumber: apartmentNumber || "",
                    amenities: selectedAmenities,
                    address,
                    lat: baseLat,
                    lng: baseLng,
                    preferredBricolerId
                },
                automation: {
                    ...automationSettings,
                    services: selectedServices.filter((id: string) => ['cleaning', 'gardening', 'glass_cleaning', 'pool_cleaning', 'errands', 'pets_care', 'guest_receptionist'].includes(id)),
                    guestServices: selectedServices.filter((id: string) => ['airport_pickup', 'guest_receptionist', 'cooking', 'tour_guide', 'private_driver', 'car_rental', 'learn_arabic', 'babysitting', 'elderly_care'].includes(id)),
                    futureServices: selectedServices.filter((id: string) => ['home_repairs', 'furniture_assembly', 'mounting', 'moving', 'plumbing', 'electricity', 'painting'].includes(id)),
                    cleaningDetails: selectedServices.includes('cleaning') ? {
                        subServices: cleaningSubServices,
                        frequencies: cleaningFrequencies,
                        stairsSize: cleaningSubServices.includes('stairs') ? stairsSize : null,
                        checklist: cleaningChecklist.filter((item: any) => item.trim() !== ''),
                        referencePhotos: finalCleaningPhotos
                    } : null,
                    glassCleaningDetails: selectedServices.includes('glass_cleaning') ? {
                        windowsCount: Number(windowsCount),
                        windowsSize,
                        windowsCoverage,
                        windowsAccessibility,
                        checklist: glassCleaningChecklist.filter((item: any) => item.trim() !== ''),
                        referencePhotos: finalGlassCleaningPhotos
                    } : null,
                    receptionDetails: selectedServices.includes('guest_receptionist') ? {
                        checkInMethod: receptionCheckInMethod,
                        phoneSupport: receptionPhoneSupport,
                        checklist: receptionChecklist.filter((item: any) => item.trim() !== '')
                    } : null,
                    gardeningDetails: selectedServices.includes('gardening') ? {
                        subServices: gardeningSubServices,
                        gardenSize,
                        shouldBringMower,
                        treeCount,
                        averageTreeHeight,
                        preferredTreeService,
                        isWasteRemovalIncluded,
                        frequencies: gardeningFrequency,
                        checklist: gardeningChecklist.filter((item: any) => item.trim() !== ''),
                        referencePhotos: finalGardeningPhotos
                    } : null,
                    poolDetails: selectedServices.includes('pool_cleaning') ? {
                        poolType,
                        poolWaterType,
                        poolSize,
                        poolDepth,
                        poolSubServices,
                        poolTechnicalRoomLocation,
                        poolSuppliesLocation,
                        poolHasRobot,
                        frequencies: poolFrequency,
                        checklist: poolChecklist.filter((item: any) => item.trim() !== ''),
                        referencePhotos: finalPoolPhotos
                    } : null,
                    petsDetails: selectedServices.includes('pets_care') ? {
                        petTypes,
                        feedingFrequency: petFeedingFrequency,
                        walkingNeeded: petWalkingNeeded,
                        medicationRequired: petMedicationNeeded,
                        instructions: petInstructions,
                        emergencyContact: petEmergencyContact,
                        preferredBricoler: petPreferredBricoler,
                        checklist: petChecklist.filter((item: any) => item.trim() !== '')
                    } : null,
                    errandsDetails: selectedServices.includes('errands') ? {
                        categories: errandsCategories,
                        checklists: errandsChecklists,
                        storageLocation: errandsStorageLocation,
                        preferredSupplier: errandsPreferredSupplier,
                        instructions: errandsInstructions,
                        frequency: errandsFrequency
                    } : null,
                    teamManagement: {
                        mode: teamMode,
                        code: propertyCode,
                        invites: (teamMode === 'own_team' || teamMode === 'both') ? teamInvites.filter((n: any) => n.trim() !== '') : []
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

            onComplete({
                id: docRef.id,
                hostId: auth.currentUser.uid,
                name: name || `${type} à ${auth.currentUser.displayName}`,
                type,
                coverPhoto: finalPhotos[0] || null,
                photos: finalPhotos,
                propertyCode: propertyCode,
                specs: { address },
                automation: { services: selectedServices }
            });
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

    const checkCanProceed = () => {
        if (viewMode === 'service_detail_form') {
            if (currentDetailServiceId === 'cleaning') {
                const needsFrequency = cleaningSubServices.includes('deep_cleaning');
                return cleaningSubServices.length > 0 && (!needsFrequency || !!cleaningFrequencies.deep_cleaning);
            }
            if (currentDetailServiceId === 'gardening') {
                return gardeningSubServices.length > 0;
            }
            if (currentDetailServiceId === 'glass_cleaning') {
                return windowsCount > 0;
            }
            if (currentDetailServiceId === 'pool_cleaning') {
                return poolTechnicalRoomLocation.trim() !== '';
            }
            if (currentDetailServiceId === 'pets_care') {
                return petTypes.length > 0;
            }
            if (currentDetailServiceId === 'errands') {
                return true;
            }
            if (currentDetailServiceId === 'guest_receptionist') {
                return receptionCheckInMethod !== '';
            }
        }
        if (viewMode === 'form') {
            if (stepIndex === 0) return type !== '';
            if (stepIndex === 1) return baseLat !== null && baseLng !== null;
            if (stepIndex === 2) return guests > 0 && bedrooms > 0 && beds > 0 && bathrooms > 0;
            if (stepIndex === 3) return true; // Amenities optional
            if (stepIndex === 4) return photos.length >= 5;
            // Steps 5, 6, 7 are service selections, which are optional.
            if (stepIndex >= 5) return true;
        }
        return true;
    };

    const canProceed = checkCanProceed();

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
                                <div className="relative w-[88px] h-[88px] shrink-0 rounded-[5px] overflow-hidden">
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
                        className="w-full bg-[#2C2C2C] text-white py-3.5 rounded-[5px] font-medium text-[17px] active:scale-[0.98] transition-all"
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
                            className="absolute top-[8%] left-[4%] w-[18%] aspect-square rounded-[5px] overflow-hidden shadow-xl border-2 border-white"
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
                            className="absolute top-[35%] right-[2%] w-[18%] aspect-square rounded-[5px] overflow-hidden shadow-xl border-2 border-white"
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
                            className="absolute bottom-[4%] right-[6%] w-[17%] aspect-square rounded-[5px] overflow-hidden shadow-xl border-2 border-white"
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
                            className="text-[18px] text-black leading-relaxed mb-6 font-medium"
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
                    <div className="flex h-[3px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;
                            if (stageIdx === 0) progress = 100;
                            if (stageIdx === 1) progress = 100;
                            if (stageIdx === 2) progress = 0;

                            return (
                                <div key={stageIdx} className="flex-1 h-[3px] bg-neutral-200 overflow-hidden">
                                    <div className="h-full bg-black transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleBack}
                            className="text-[17px] font-black text-black underline underline-offset-4"
                        >
                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('form');
                                setStepIndex(5);
                            }}
                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[5px] text-[17px] font-medium active:scale-[0.98] transition-all"
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
                <div className="px-4 pt-5 pb-2 flex justify-between items-center gap-2 min-w-0">
                    <button onClick={handleBack} className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all whitespace-nowrap" >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <button onClick={() => setIsQuestionsOpen(true)} className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all text-black whitespace-nowrap">
                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                        </button>
                        <button onClick={handleSaveAndExit} className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all text-black whitespace-nowrap">
                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
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
                        className="w-[80%] aspect-square mb-12 rounded-[5px] overflow-hidden mx-auto"
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
                    <div className="flex h-[3px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;
                            if (stageIdx === 0) progress = 0;
                            if (stageIdx === 1) progress = 0;
                            if (stageIdx === 2) progress = 0;

                            return (
                                <div key={stageIdx} className="flex-1 h-[3px] bg-neutral-200 overflow-hidden">
                                    <div className="h-full bg-black transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center">
                        <button onClick={handleBack} className="font-bold text-[16px] text-black underline underline-offset-4 active:scale-95 transition-all" >
                            {t({ en: 'Back', fr: 'Retour' })}
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('form');
                                setStepIndex(0);
                            }}
                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[5px] text-[17px] font-medium active:scale-[0.98] transition-all"
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
                <div className="px-4 pt-5 pb-2 flex justify-between items-center gap-2 min-w-0">
                    <button onClick={handleBack} className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all whitespace-nowrap" >
                        {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <button onClick={() => setIsQuestionsOpen(true)} className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all text-black whitespace-nowrap">
                            {t({ en: 'Questions?', fr: 'Des questions ?' })}
                        </button>
                        <button onClick={handleSaveAndExit} className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all text-black whitespace-nowrap">
                            {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
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
                        className="w-[60%] aspect-square mb-12 rounded-[5px] overflow-hidden mx-auto"
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
                    <div className="flex h-[3px] mb-6">
                        {[0, 1, 2].map((stageIdx) => {
                            let progress = 0;
                            if (stageIdx === 0) progress = 100;
                            if (stageIdx === 1) progress = 0;
                            if (stageIdx === 2) progress = 0;

                            return (
                                <div key={stageIdx} className="flex-1 h-[3px] bg-neutral-200 overflow-hidden">
                                    <div className="h-full bg-black transition-all duration-500 ease-in-out" style={{ width: `${progress}%` }} />
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between items-center">
                        <button onClick={handleBack} className="font-bold text-[16px] text-black underline underline-offset-4 active:scale-95 transition-all" >
                            {t({ en: 'Back', fr: 'Retour' })}
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('form');
                                setStepIndex(3);
                            }}
                            disabled={anyIsUploading}
                            className="bg-[#2C2C2C] disabled:bg-neutral-200 text-white px-10 py-4 rounded-[5px] text-[17px] font-medium active:scale-[0.98] transition-all"
                        >
                            {anyIsUploading ? t({ en: 'Uploading...', fr: 'Téléchargement...' }) : t({ en: 'Next', fr: 'Suivant' })}
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
                        {t({ en: 'Listings', fr: 'Annonces', ar: 'إعلاناتي' })}
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
                                <div className="relative w-20 h-20 rounded-[5px] overflow-hidden shrink-0 border border-neutral-100">
                                    <Image
                                        src={photos[0] || '/Images/placeholder-property.jpg'}
                                        alt={name}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute top-1.5 left-1.5 w-3 h-3 bg-[#4CAF50] rounded-full border-2 border-white" />
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

                {/* Floating Action Button removed per design directive */}

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

            {/* Top Bar: Save & Exit — always visible except during location picker */}
            {stepIndex !== 1 && (
                <div className="px-4 pt-4 pb-1 flex justify-end items-center shrink-0 gap-2 min-w-0">
                    <button
                        onClick={() => setIsQuestionsOpen(true)}
                        className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all text-black whitespace-nowrap"
                    >
                        {t({ en: 'Questions?', fr: 'Des questions ?' })}
                    </button>
                    <button
                        onClick={handleSaveAndExit}
                        className="font-bold px-3 py-2 rounded-full border border-neutral-200 text-[13px] hover:bg-neutral-50 active:scale-95 transition-all text-black whitespace-nowrap"
                    >
                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                    </button>
                </div>
            )}

            {/* FAQ / Questions Modal — shown in all form views */}
            <AnimatePresence>
                {isQuestionsOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[20000] bg-black/40  flex items-end"
                        onClick={() => setIsQuestionsOpen(false)}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="w-full bg-[#F3F2ED] rounded-t-[10px] overflow-hidden max-h-[85vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-100">
                                <h2 className="font-semibold text-[20px] text-black">{t({ en: 'Frequently Asked Questions', fr: 'Questions fréquentes' })}</h2>
                                <button onClick={() => setIsQuestionsOpen(false)} className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                    <X size={18} className="text-black" />
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1 divide-y divide-neutral-100">
                                {FAQ_SERVICES.map((faq, i) => (
                                    <div key={i}>
                                        <button
                                            className="w-full flex items-center justify-between px-6 py-4 text-left"
                                            onClick={() => setExpandedFaqIndex(expandedFaqIndex === i ? null : i)}
                                        >
                                            <span className="font-semibold text-[16px] text-black">{faq.title}</span>
                                            <ChevronDown size={18} className={`text-neutral-400 transition-transform ${expandedFaqIndex === i ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {expandedFaqIndex === i && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <p className="px-6 pb-5 text-[15px] text-black leading-relaxed">{faq.content}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            <div
                ref={scrollContainerRef}
                className={cn(
                    "flex-1 overflow-y-auto overscroll-behavior-contain",
                    (stepIndex === 1) ? "p-0" : "px-6 py-6"
                )}>
                <AnimatePresence mode="wait">
                    {viewMode === 'form' && (
                        <motion.div
                            key={stepIndex}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
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
                                                    className={`flex flex-col items-start justify-between p-4 rounded-[5px] border transition-all h-[120px] ${isActive ? 'border-black border-[1px] bg-neutral-50' : 'border-neutral-200 hover:border-black bg-white'}`}
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center">

                                                        <Icon size={32} className="text-black" />

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
                                    <div className="pt-4 pb-6">
                                        <h2 className="font-medium text-[32px] text-black leading-tight tracking-tight mb-2">
                                            {t({
                                                en: 'List your inclusions.',
                                                fr: 'Listez vos inclusions.',
                                                ar: 'أضف مرافق مكان إقامتك.'
                                            })}
                                        </h2>
                                        <p className="text-[17px] text-black font-medium leading-relaxed mt-6">
                                            {t({
                                                en: 'Do you have any unique spaces?',
                                                fr: 'Possédez-vous des espaces uniques ?',
                                                ar: 'هل لديك مساحات فريدة؟'
                                            })}
                                        </p>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pb-32">
                                        <div className="space-y-12">
                                            {AMENITY_GROUPS.map((group) => (
                                                <div key={group.id} className="space-y-6">
                                                    {group.id !== 'standout' && (
                                                        <h3 className="font-medium text-[18px] text-black leading-tight">
                                                            {t(group.title)}
                                                        </h3>
                                                    )}
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
                                                                                ? prev.filter((id: any) => id !== amenity.id)
                                                                                : [...prev, amenity.id]
                                                                        );
                                                                    }}
                                                                    className={`flex flex-col items-start justify-between p-6 rounded-[5px] border transition-all h-[150px] text-left ${isSelected
                                                                        ? 'border-black border-[2px] bg-neutral-50'
                                                                        : 'border-neutral-200 hover:border-black bg-white'
                                                                        }`}
                                                                >
                                                                    <Icon size={32} strokeWidth={1.5} className="text-black" />
                                                                    <span className="text-[16px] font-medium text-black leading-tight">
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
                                                    className="w-full p-6 rounded-[5px] border border-neutral-200 flex items-center justify-start gap-6 active:scale-[0.98] transition-all hover:bg-neutral-50 disabled:opacity-50"
                                                >
                                                    <Plus className="text-black shrink-0" size={24} strokeWidth={1.5} />
                                                    <span className="text-[16px] font-light text-black">
                                                        {isUploading ? 'Chargement...' : t({ en: 'Add photos', fr: 'Ajouter des photos', ar: 'إضافة صور' })}
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => cameraInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    className="w-full p-6 rounded-[5px] border border-neutral-200 flex items-center justify-start gap-6 active:scale-[0.98] transition-all hover:bg-neutral-50 disabled:opacity-50"
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
                                                    <h2 className="font-medium text-[28px] text-black leading-tight tracking-tight">Vos photos (min 5 photos)</h2>
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
                                                {photos.map((photo: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        draggable
                                                        onDragStart={() => handleDragStart(idx)}
                                                        onDragOver={(e) => handleDragOver(e, idx)}
                                                        onDrop={() => handleDrop(idx)}
                                                        onDragEnd={() => setDragOverIndex(null)}
                                                        className={cn(
                                                            "relative overflow-hidden bg-neutral-100 border rounded-[5px] cursor-grab active:cursor-grabbing transition-all",
                                                            idx === 0 ? "col-span-2 aspect-[4/3]" : "aspect-square",
                                                            dragOverIndex === idx ? "border-black ring-2 ring-black scale-[0.98] opacity-80" : "border-neutral-200"
                                                        )}
                                                    >
                                                        <Image src={photo} alt="Property" fill className="object-cover pointer-events-none" />

                                                        {idx === 0 && (
                                                            <div className="absolute top-3 left-3 bg-white px-3 py-1.5 rounded-[5px] text-[13px] font-medium">
                                                                Couverture
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={() => deletePhoto(idx)}
                                                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-90 transition-all hover:bg-red-50"
                                                        >
                                                            <Trash2 size={15} className="text-neutral-600 hover:text-red-500 transition-colors" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {isUploading && (
                                                    <div className="aspect-square relative overflow-hidden bg-neutral-100 border border-neutral-200 rounded-[5px] flex items-center justify-center">
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
                                                        className="fixed bottom-[130px] left-4 right-4 bg-[#F2F0EC] p-6 rounded-[5px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] z-[10010] border border-neutral-100"
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
                                        {SERVICES_CATALOGUE.filter((c: any) => !c.disabled && ['cleaning', 'gardening', 'glass_cleaning', 'pool_cleaning', 'errands', 'pets_care', 'guest_receptionist'].includes(c.id)).map((category: any) => {
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
                                            ...SERVICES_CATALOGUE.filter((c: any) => !c.disabled && ['cooking', 'tour_guide', 'private_driver', 'car_rental', 'learn_arabic', 'babysitting', 'elderly_care'].includes(c.id))
                                        ].map((category: any) => {
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
                                        {SERVICES_CATALOGUE.filter((c: any) => !c.disabled && ['home_repairs', 'furniture_assembly', 'mounting', 'moving', 'plumbing', 'electricity', 'painting'].includes(c.id)).map((category: any) => {
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
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentDetailServiceId}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="flex-1 flex flex-col min-h-0"
                            >
                                {currentDetailServiceId === 'cleaning' && (
                                    <CleaningDetailForm
                                        data={{
                                            subServices: cleaningSubServices,
                                            frequencies: cleaningFrequencies,
                                            stairsSize: stairsSize,
                                            checklist: cleaningChecklist,
                                            referencePhotos: cleaningPhotos
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.subServices !== undefined) setCleaningSubServices(updates.subServices);
                                            if (updates.frequencies !== undefined) setCleaningFrequencies(updates.frequencies);
                                            if (updates.stairsSize !== undefined) setStairsSize(updates.stairsSize as any);
                                            if (updates.checklist !== undefined) setCleaningChecklist(updates.checklist);
                                            if (updates.referencePhotos !== undefined) setCleaningPhotos(updates.referencePhotos);
                                        }}
                                        onUploadingChange={setIsUploadingCleaningPhotos}
                                    />
                                )}
                                {/* REMOVED INLINE CLEANING FORM */}

                                {currentDetailServiceId === 'glass_cleaning' && (
                                    <GlassCleaningDetailForm
                                        data={{
                                            windowsCount,
                                            windowsSize,
                                            windowsCoverage,
                                            windowsAccessibility,
                                            checklist: glassCleaningChecklist,
                                            referencePhotos: glassCleaningPhotos
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.windowsCount !== undefined) setWindowsCount(updates.windowsCount);
                                            if (updates.windowsSize !== undefined) setWindowsSize(updates.windowsSize as any);
                                            if (updates.windowsCoverage !== undefined) setWindowsCoverage(updates.windowsCoverage as any);
                                            if (updates.windowsAccessibility !== undefined) setWindowsAccessibility(updates.windowsAccessibility as any);
                                            if (updates.checklist !== undefined) setGlassCleaningChecklist(updates.checklist);
                                            if (updates.referencePhotos !== undefined) setGlassCleaningPhotos(updates.referencePhotos);
                                        }}
                                        onUploadingChange={setIsUploadingGlassPhotos}
                                    />
                                )}

                                {currentDetailServiceId === 'gardening' && (
                                    <GardeningDetailForm
                                        data={{
                                            subServices: gardeningSubServices,
                                            gardenSize: gardenSize,
                                            shouldBringMower: shouldBringMower,
                                            treeCount: treeCount,
                                            averageTreeHeight: averageTreeHeight,
                                            preferredTreeService: preferredTreeService,
                                            isWasteRemovalIncluded: isWasteRemovalIncluded,
                                            frequency: gardeningFrequency,
                                            checklist: gardeningChecklist,
                                            referencePhotos: gardeningPhotos
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.subServices !== undefined) setGardeningSubServices(updates.subServices);
                                            if (updates.gardenSize !== undefined) setGardenSize(updates.gardenSize as any);
                                            if (updates.shouldBringMower !== undefined) setShouldBringMower(updates.shouldBringMower);
                                            if (updates.treeCount !== undefined) setTreeCount(updates.treeCount);
                                            if (updates.averageTreeHeight !== undefined) setAverageTreeHeight(updates.averageTreeHeight);
                                            if (updates.preferredTreeService !== undefined) setPreferredTreeService(updates.preferredTreeService);
                                            if (updates.isWasteRemovalIncluded !== undefined) setIsWasteRemovalIncluded(updates.isWasteRemovalIncluded);
                                            if (updates.frequency !== undefined) setGardeningFrequency(updates.frequency);
                                            if (updates.checklist !== undefined) setGardeningChecklist(updates.checklist);
                                            if (updates.referencePhotos !== undefined) setGardeningPhotos(updates.referencePhotos);
                                        }}
                                        onUploadingChange={setIsUploadingGardeningPhotos}
                                    />
                                )}

                                {currentDetailServiceId === 'pets_care' && (
                                    <PetsDetailForm
                                        data={{
                                            petTypes,
                                            petDetails,
                                            emergencyContact: petEmergencyContact,
                                            preferredBricoler: petPreferredBricoler,
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.petTypes !== undefined) setPetTypes(updates.petTypes);
                                            if (updates.petDetails !== undefined) setPetDetails(updates.petDetails);
                                            if (updates.emergencyContact !== undefined) setPetEmergencyContact(updates.emergencyContact);
                                            if (updates.preferredBricoler !== undefined) setPetPreferredBricoler(updates.preferredBricoler);
                                        }}
                                    />
                                )}


                                {currentDetailServiceId === 'pool_cleaning' && (
                                    <PoolDetailForm
                                        data={{
                                            poolType,
                                            poolWaterType,
                                            poolSize,
                                            poolDepth,
                                            subServices: poolSubServices,
                                            hasRobot: poolHasRobot,
                                            technicalRoomLocation: poolTechnicalRoomLocation,
                                            suppliesLocation: poolSuppliesLocation,
                                            frequency: poolFrequency,
                                            checklist: poolChecklist,
                                            referencePhotos: poolPhotos
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.poolType !== undefined) setPoolType(updates.poolType as any);
                                            if (updates.poolWaterType !== undefined) setPoolWaterType(updates.poolWaterType as any);
                                            if (updates.poolSize !== undefined) setPoolSize(updates.poolSize as any);
                                            if (updates.poolDepth !== undefined) setPoolDepth(updates.poolDepth);
                                            if (updates.subServices !== undefined) setPoolSubServices(updates.subServices);
                                            if (updates.hasRobot !== undefined) setPoolHasRobot(updates.hasRobot);
                                            if (updates.technicalRoomLocation !== undefined) setPoolTechnicalRoomLocation(updates.technicalRoomLocation);
                                            if (updates.suppliesLocation !== undefined) setPoolSuppliesLocation(updates.suppliesLocation);
                                            if (updates.frequency !== undefined) setPoolFrequency(updates.frequency);
                                            if (updates.checklist !== undefined) setPoolChecklist(updates.checklist);
                                            if (updates.referencePhotos !== undefined) setPoolPhotos(updates.referencePhotos);
                                        }}
                                        onUploadingChange={setIsUploadingPoolPhotos}
                                    />
                                )}

                                {currentDetailServiceId === 'guest_receptionist' && (
                                    <ReceptionistDetailForm
                                        data={{
                                            checkInMethod: receptionCheckInMethod,
                                            phoneSupport: receptionPhoneSupport,
                                            checklist: receptionChecklist
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.checkInMethod !== undefined) setReceptionCheckInMethod(updates.checkInMethod);
                                            if (updates.phoneSupport !== undefined) setReceptionPhoneSupport(updates.phoneSupport);
                                            if (updates.checklist !== undefined) setReceptionChecklist(updates.checklist);
                                        }}
                                    />
                                )}


                                {/* Errands & Restocking Details */}
                                {currentDetailServiceId === 'errands' && (
                                    <ErrandsDetailForm
                                        data={{
                                            categories: errandsCategories,
                                            checklists: errandsChecklists,
                                            storageLocation: errandsStorageLocation,
                                            preferredSupplier: errandsPreferredSupplier,
                                            frequency: errandsFrequency,
                                            instructions: errandsInstructions
                                        }}
                                        onChange={(updates: any) => {
                                            if (updates.categories !== undefined) setErrandsCategories(updates.categories);
                                            if (updates.checklists !== undefined) setErrandsChecklists(updates.checklists);
                                            if (updates.storageLocation !== undefined) setErrandsStorageLocation(updates.storageLocation);
                                            if (updates.preferredSupplier !== undefined) setErrandsPreferredSupplier(updates.preferredSupplier);
                                            if (updates.frequency !== undefined) setErrandsFrequency(updates.frequency);
                                            if (updates.instructions !== undefined) setErrandsInstructions(updates.instructions);
                                        }}
                                    />
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
                        </AnimatePresence>
                    )}

                    {viewMode === 'team_mode_select' && (
                        <motion.div
                            key="team-mode-select"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col min-h-0"
                        >
                            <div className="flex-1 overflow-y-auto  pt-8 pb-12">
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
                                                        className={`w-full flex items-center justify-between p-6 rounded-[5px] border transition-all text-left ${isActive ? 'border-black border-2 bg-neutral-50 ring-1 ring-black' : 'border-neutral-200 hover:border-black'}`}
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
                                        <div className="flex items-center justify-between p-5 bg-[#FFFFFF] rounded-[5px] border border-neutral-100 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 flex items-center justify-center">
                                                    <QrCode size={22} strokeWidth={1.5} className="text-black" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-medium text-black">{t({ en: 'Property Invite Code', fr: 'Code d\'invitation propriété' })}</span>
                                                    <span className="text-[13px] text-neutral-400 font-mono tracking-wider">{propertyCode}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (propertyCode) {
                                                        navigator.clipboard.writeText(propertyCode);
                                                        showToast({
                                                            variant: 'success',
                                                            title: t({ en: 'Copied!', fr: 'Copié !' }),
                                                            description: t({ en: 'Code copied to clipboard.', fr: 'Code copié dans le presse-papier.' })
                                                        });
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-[13px] font-medium hover:border-black active:scale-95 transition-all"
                                            >
                                                <Copy size={14} />
                                                {t({ en: 'Copy', fr: 'Copier' })}
                                            </button>
                                        </div>
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
                                            {teamInvites.map((invite: any, idx: number) => (
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
                                                            className="w-full bg-[#F7F7F7] rounded-[5px] px-4 py-3 text-[15px] font-light border border-transparent focus:border-black focus:bg-white transition-all outline-none"
                                                        />
                                                    </div>
                                                    {teamInvites.length > 1 && (
                                                        <button
                                                            onClick={() => setTeamInvites(teamInvites.filter((_: any, i: number) => i !== idx))}
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
                <div className="relative bg-white z-20">
                    <WaveTop fill="white" />
                    <div className="px-6 pt-4 pb-6 border-t border-neutral-100 flex flex-col gap-4">
                        {/* Segmented Progress Bar — bold, 3 stages with gaps */}
                        <div className="flex gap-2 mb-6">
                            {[0, 1, 2].map((stageIdx) => {
                                let progress = 0;
                                const selectedAutomationServices = selectedServices.filter((id: any) => AUTOMATED_SERVICE_IDS.includes(id));
                                const totalAutomationSubsteps = selectedAutomationServices.length;
                                const currentAutoIdx = currentDetailServiceId ? selectedAutomationServices.indexOf(currentDetailServiceId) : -1;

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
                                    else if ((viewMode as string) === 'team_mode_select') progress = 100;
                                    else if ((viewMode as string) === 'service_detail_form') {
                                        if (totalAutomationSubsteps > 0) {
                                            const substepProgress = Math.round(33 + ((currentAutoIdx + 1) / totalAutomationSubsteps) * 56);
                                            progress = substepProgress;
                                        } else {
                                            progress = 90;
                                        }
                                    }
                                    else if (stepIndex === 5) progress = 33;
                                    else if (stepIndex === 6) progress = 66;
                                    else if (stepIndex >= 7) progress = 99;
                                }

                                return (
                                    <div key={stageIdx} className="flex-1 flex flex-col gap-1">
                                        <div className="h-[4px] rounded-full bg-neutral-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-black transition-all duration-500 ease-in-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center">
                            <button onClick={handleBack} className="font-bold text-[17px] text-black underline underline-offset-4">
                                {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={!canProceed || isSubmitting || (viewMode === 'team_mode_select' && !teamMode)}
                                className={`bg-[#2C2C2C] disabled:bg-neutral-200 text-white px-10 py-4 rounded-[5px] text-[17px] font-medium active:scale-[0.98] transition-all ${!canProceed && 'opacity-50 cursor-not-allowed'}`}
                            >
                                {isSubmitting ? 'Publication...' : viewMode === 'team_mode_select' ? 'Publier l\'annonce' : 'Suivant'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertySetupWizard;

// --- Sub-components for Service Detail Forms ---

const CleaningDetailForm = ({ data, onChange, onUploadingChange }: any) => {
    const { t } = useLanguage();
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        onUploadingChange?.(true);

        try {
            const uploadPromises = files.map(async (file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const url = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/cleaning`,
                                'lbricol_portfolio'
                            );
                            resolve(url);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });

            const urls = await Promise.all(uploadPromises);
            onChange({ referencePhotos: [...(data.referencePhotos || []), ...urls] });
        } catch (error) {
            console.error('Error uploading photos:', error);
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
        }
    };

    const toggleSubService = (id: string) => {
        const current = data.subServices || [];
        const next = current.includes(id) ? current.filter((s: any) => s !== id) : [...current, id];
        onChange({ subServices: next });
    };

    const cleaningTypes = [
        {
            id: 'post_checkout',
            label: 'Nettoyage checkout',
            fr: 'Nettoyage checkout',
            iconPath: '/Icons/checkout cleaning.svg'
        },
        {
            id: 'deep_cleaning',
            label: 'Nettoyage en profondeur',
            fr: 'Nettoyage en profondeur',
            iconPath: '/Icons/deep clean.svg',
            hasFrequency: true
        },
        {
            id: 'stairs_cleaning',
            label: 'Nettoyage des escaliers',
            fr: 'Nettoyage des escaliers',
            iconPath: '/Icons/stairs cleaning.svg',
            hasCounter: true,
            hasFrequency: true
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            <h2 className="font-bold text-[32px] text-[#222222] leading-tight tracking-tight mb-8">
                {t({ en: 'Cleaning Details', fr: 'Détails du Ménage' })}
            </h2>

            <div className="space-y-12">
                <div className="space-y-6">
                    <h3 className="text-[17px] font-medium text-[#222222] mb-4">
                        {t({ en: 'What type of cleaning?', fr: 'Quel type de nettoyage ?' })}
                    </h3>
                    <div className="space-y-4">
                        {cleaningTypes.map((item) => {
                            const isSelected = (data.subServices || []).includes(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`relative rounded-[5px] border transition-all duration-300 ${isSelected
                                        ? 'border-black border-[1px] bg-white'
                                        : 'border-neutral-200 hover:border-black bg-white'
                                        }`}
                                >
                                    <button
                                        onClick={() => toggleSubService(item.id)}
                                        className="w-full flex items-center justify-between px-10 py-12 text-left"
                                    >
                                        <div className="flex-1 pr-20">
                                            <span className="text-[23px] font-bold text-[#222222] leading-tight block">
                                                {t({ en: item.label, fr: item.fr })}
                                            </span>
                                        </div>
                                        <div className="shrink-0">
                                            <img
                                                src={item.iconPath}
                                                alt={item.label}
                                                className="w-16 h-16 object-contain"
                                            />
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-5 right-5 w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {isSelected && (item.hasFrequency || item.hasCounter) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                                className="overflow-hidden"
                                            >
                                                {item.hasFrequency && (
                                                    <div className="px-10 pb-10 pt-2 border-t border-neutral-50">
                                                        <p className="text-[15px] font-medium text-[#222222] mb-5">
                                                            {t({ en: `${item.label} Frequency`, fr: `Fréquence du ${item.fr}` })}
                                                        </p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {[
                                                                { id: 'weekly', label: 'Weekly', fr: 'Hebdomadaire' },
                                                                { id: 'biweekly', label: 'Bi-weekly', fr: 'Bimensuelle' },
                                                                { id: 'monthly', label: 'Monthly', fr: 'Mensuelle' },
                                                                { id: 'quarterly', label: 'Quarterly', fr: 'Trimestrielle' },
                                                            ].map((freq: any) => {
                                                                const isActive = (data.frequencies || {})[item.id] === freq.id;
                                                                return (
                                                                    <button
                                                                        key={freq.id}
                                                                        onClick={() => onChange({ frequencies: { ...(data.frequencies || {}), [item.id]: freq.id } })}
                                                                        className={`px-6 py-3 rounded-full text-[14px] transition-all active:scale-95 border ${isActive
                                                                            ? 'border-black bg-white text-[#222222] font-bold'
                                                                            : 'border-neutral-200 hover:border-black bg-white font-bold'
                                                                            }`}
                                                                    >
                                                                        {t({ en: freq.label, fr: freq.fr })}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Nested content for Stairs */}
                                                {item.hasCounter && (
                                                    <div className="px-10 pb-10 pt-2 border-t border-neutral-50">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <p className="text-[15px] font-medium text-[#222222] flex-1">
                                                                {t({ en: 'How many floors to clean?', fr: 'Combien d\'étages à nettoyer ?' })}
                                                            </p>
                                                            <div className="bg-[#F7F7F7] rounded-full px-2 shrink-0">
                                                                <CounterRow
                                                                    label=""
                                                                    py="py-1"
                                                                    value={Number(data.stairsSize || 1)}
                                                                    onChange={(val) => onChange({ stairsSize: val })}
                                                                    min={1}
                                                                    max={10}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[18px] font-bold text-[#222222] mb-4">
                        {t({ en: 'Specific Instructions', fr: 'Instructions spécifiques' })}
                    </h3>
                    <div className="rounded-[5px] border border-[#EBEBEB] bg-white px-5 divide-y divide-[#EBEBEB]">
                        {(data.checklist || ['']).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4 py-4 min-h-[64px]">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-[#EBEBEB]'}`}>
                                    {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={4} />}
                                </div>
                                <input
                                    type="text"
                                    autoFocus={idx > 0 && item === ''}
                                    value={item}
                                    onChange={(e) => {
                                        const next = [...(data.checklist || [''])];
                                        next[idx] = e.target.value;
                                        onChange({ checklist: next });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && item.trim() !== '') {
                                            onChange({ checklist: [...(data.checklist || []), ''] });
                                        }
                                    }}
                                    placeholder={t({ en: 'Add an instruction…', fr: 'Ajouter une instruction…' })}
                                    className="flex-1 py-1 bg-transparent border-none focus:ring-0 text-[16px] text-[#222222] placeholder:text-[#AAAAAA] outline-none"
                                />
                                {((data.checklist || []).length > 1 || item.trim() !== '') && (
                                    <button
                                        onClick={() => {
                                            const next = (data.checklist || []).filter((_: any, i: number) => i !== idx);
                                            onChange({ checklist: next.length === 0 ? [''] : next });
                                        }}
                                        className="p-2 text-[#717171] hover:text-[#222222] hover:bg-[#F7F7F7] rounded-full transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Reference photos ── */}
                <div className="space-y-4">
                    <h3 className="text-[18px] font-bold text-[#222222]">
                        {t({ en: 'Reference Photos', fr: 'Photos de Référence' })}
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {(data.referencePhotos || []).map((url: any, i: number) => (
                            <div key={url} className="relative aspect-square rounded-[5px] overflow-hidden border border-[#EBEBEB]">
                                <img src={url} alt="Reference" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => onChange({ referencePhotos: data.referencePhotos.filter((_: any, idx: number) => idx !== i) })}
                                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-[#EBEBEB]"
                                >
                                    <X size={14} className="text-[#222222]" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => photoInputRef.current?.click()}
                            className="aspect-square rounded-[5px] border-2 border-dashed border-[#EBEBEB] flex flex-col items-center justify-center gap-2 hover:border-[#222222] hover:bg-[#F7F7F7] transition-all text-[#717171] hover:text-[#222222]"
                        >
                            {isUploading ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                                    <Plus size={24} />
                                </motion.div>
                            ) : (
                                <>
                                    <Plus size={24} />
                                    <span className="text-[12px] font-bold uppercase tracking-wider">{t({ en: 'Add', fr: 'Ajouter' })}</span>
                                </>
                            )}
                        </button>
                    </div>
                    <input type="file" multiple hidden ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" />
                </div>
            </div>
        </div>
    );
};

const GlassCleaningDetailForm = ({ data, onChange, onUploadingChange }: any) => {
    const { t } = useLanguage();
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setIsUploading(true);
        onUploadingChange?.(true);
        try {
            const uploadPromises = files.map(async (file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const url = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/glass`,
                                'lbricol_portfolio'
                            );
                            resolve(url);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });
            const urls = await Promise.all(uploadPromises);
            onChange({ referencePhotos: [...(data.referencePhotos || []), ...urls] });
        } catch (error) {
            console.error('Error uploading photos:', error);
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            <h2 className="font-bold text-[32px] text-[#222222] leading-tight tracking-tight mb-8">
                {t({ en: 'Glass & Window Cleaning', fr: 'Nettoyage des Vitres' })}
            </h2>

            <div className="space-y-12">
                <div className="space-y-4 p-6 rounded-[5px] border border-neutral-100 bg-neutral-50/50">
                    <CounterRow
                        label={t({ en: 'Number of windows', fr: 'Nombre de fenêtres' })}
                        value={data.windowsCount || 1}
                        onChange={(val) => onChange({ windowsCount: val })}
                        min={1}
                    />
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold text-[18px] text-[#222222] mb-4">{t({ en: 'Majority Window Size', fr: 'Taille majoritaire des vitres' })}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'small', label: 'Small', fr: 'Petite' },
                            { id: 'medium', label: 'Medium', fr: 'Moyenne' },
                            { id: 'large', label: 'Large', fr: 'Grande' }
                        ].map((item: any) => (
                            <button
                                key={item.id}
                                onClick={() => onChange({ windowsSize: item.id })}
                                className={`p-4 rounded-[5px] border text-center transition-all ${data.windowsSize === item.id
                                    ? 'border-black border-[1px] bg-white text-[16px] font-medium'
                                    : 'border-neutral-200 hover:border-black bg-white text-[16px] text-neutral-500'
                                    }`}
                            >
                                <span className="text-[15px] font-medium">{t({ en: item.label, fr: item.fr })}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold text-[18px] text-[#222222] mb-4">{t({ en: 'Access & Difficulty', fr: 'Accès et Difficulté' })}</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { id: 'ground', label: 'Easy access (Ground floor)', fr: 'Accès facile (RDC)' },
                            { id: 'ladder', label: 'Requires ladder', fr: 'Nécessite échelle' },
                        ].map((item: any) => (
                            <button
                                key={item.id}
                                onClick={() => onChange({ windowsAccessibility: item.id })}
                                className={`w-full flex items-center justify-between p-6 rounded-[5px] border transition-all ${data.windowsAccessibility === item.id
                                    ? 'border-black border-[1px] bg-white'
                                    : 'border-neutral-200 hover:border-black bg-white'
                                    }`}
                            >
                                <span className="text-[17px] font-medium text-black">{t({ en: item.label, fr: item.fr })}</span>
                                {data.windowsAccessibility === item.id && (
                                    <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                                        <Check size={14} className="text-white" strokeWidth={3} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold text-[18px] text-[#222222] mb-4">{t({ en: 'Coverage', fr: 'Couverture' })}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'interior', label: 'Inside', fr: 'Intérieur' },
                            { id: 'exterior', label: 'Outside', fr: 'Extérieur' },
                            { id: 'both', label: 'Both', fr: 'Les deux' }
                        ].map((item: any) => (
                            <button
                                key={item.id}
                                onClick={() => onChange({ windowsCoverage: item.id })}
                                className={`p-4 rounded-[5px] border text-center transition-all ${data.windowsCoverage === item.id
                                    ? 'border-black border-[1px] bg-white text-black font-medium'
                                    : 'border-neutral-200 hover:border-black bg-white text-neutral-500'
                                    }`}
                            >
                                <span className="text-[15px] font-medium">{t({ en: item.label, fr: item.fr })}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Specific Instructions Checklist */}
                <div className="space-y-6">
                    <h3 className="text-[18px] font-bold text-[#222222] mb-4">
                        {t({ en: 'Specific Instructions', fr: 'Instructions spécifiques' })}
                    </h3>
                    <div className="rounded-[5px] border border-[#EBEBEB] bg-white px-5 divide-y divide-[#EBEBEB]">
                        {(data.checklist || ['']).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-4 py-4 min-h-[64px]">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-[#EBEBEB]'}`}>
                                    {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={4} />}
                                </div>
                                <input
                                    type="text"
                                    autoFocus={idx > 0 && item === ''}
                                    value={item}
                                    onChange={(e) => {
                                        const next = [...(data.checklist || [''])];
                                        next[idx] = e.target.value;
                                        onChange({ checklist: next });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && item.trim() !== '') {
                                            onChange({ checklist: [...(data.checklist || []), ''] });
                                        }
                                    }}
                                    placeholder={t({ en: 'Add an instruction…', fr: 'Ajouter une instruction…' })}
                                    className="flex-1 py-1 bg-transparent border-none focus:ring-0 text-[16px] text-[#222222] placeholder:text-[#AAAAAA] outline-none"
                                />
                                {((data.checklist || []).length > 1 || item.trim() !== '') && (
                                    <button
                                        onClick={() => {
                                            const next = (data.checklist || []).filter((_: any, i: number) => i !== idx);
                                            onChange({ checklist: next.length === 0 ? [''] : next });
                                        }}
                                        className="p-2 text-[#717171] hover:text-[#222222] hover:bg-[#F7F7F7] rounded-full transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <h3 className="font-bold text-[18px] text-[#222222] mb-4">{t({ en: 'Reference Photos', fr: 'Photos de Référence' })}</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {(data.referencePhotos || []).map((url: any, i: number) => (
                            <div key={url} className="relative aspect-square rounded-[5px] overflow-hidden border border-neutral-100">
                                <img src={url} alt="Reference" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => onChange({ referencePhotos: data.referencePhotos.filter((_: any, idx: number) => idx !== i) })}
                                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-neutral-100"
                                >
                                    <X size={14} className="text-black" />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => photoInputRef.current?.click()}
                            className="aspect-square rounded-[5px] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-neutral-50 transition-all text-neutral-400 hover:text-black"
                        >
                            {isUploading ? (
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
                    </div>
                    <input type="file" multiple hidden ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" />
                </div>
            </div>
        </div>
    );
};


const GardeningDetailForm = ({ data, onChange, onUploadingChange }: any) => {
    const { t } = useLanguage();
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setIsUploading(true);
        onUploadingChange?.(true);
        try {
            const uploadPromises = files.map(async (file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const url = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/gardening`,
                                'lbricol_portfolio'
                            );
                            resolve(url);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });
            const urls = await Promise.all(uploadPromises);
            onChange({ referencePhotos: [...(data.referencePhotos || []), ...urls] });
        } catch (error) {
            console.error('Error uploading photos:', error);
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
        }
    };

    const toggleSubService = (id: string) => {
        const current = data.subServices || [];
        const next = current.includes(id) ? current.filter((s: any) => s !== id) : [...current, id];
        onChange({ subServices: next });
    };

    const gardeningTypes = [
        {
            id: 'lawn',
            label: 'Lawn Mowing',
            fr: 'Tonte pelouse',
            emoji: '🌱',
            hasMower: true
        },
        {
            id: 'pruning',
            label: 'Tree Pruning',
            fr: 'Élagage',
            emoji: '🌳',
            hasTreeSpecs: true
        },
        {
            id: 'maintenance',
            label: 'General Maintenance',
            fr: 'Entretien général',
            emoji: '🌿',
            hasSubOptions: true
        }
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            <h2 className="font-bold text-[32px] text-[#222222] leading-tight tracking-tight mb-8">
                {t({ en: 'Gardening Details', fr: 'Détails du Jardinage' })}
            </h2>

            <div className="space-y-12">
                {/* Garden Size Section */}
                <div className="space-y-6">
                    <h3 className="text-[17px] font-medium text-[#222222] mb-4">{t({ en: 'Garden Size', fr: 'Taille du jardin' })}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'small', label: 'Small', fr: 'Petit', desc: '< 50m²' },
                            { id: 'medium', label: 'Medium', fr: 'Moyen', desc: '50-150m²' },
                            { id: 'big', label: 'Big', fr: 'Grand', desc: '150-300m²' },
                            { id: 'bigger', label: 'Bigger', fr: 'Plus grand', desc: '> 300m²' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onChange({ gardenSize: item.id })}
                                className={`p-4 rounded-[5px] border text-left transition-all ${data.gardenSize === item.id
                                    ? 'border-black border-[2px] bg-white'
                                    : 'border-neutral-200 hover:border-black bg-white'
                                    }`}
                            >
                                <div className="font-bold text-[16px] text-black">{t({ en: item.label, fr: item.fr })}</div>
                                <div className="text-[13px] text-neutral-500">{item.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* The 3 Accordions */}
                <div className="space-y-6">
                    <h3 className="text-[17px] font-medium text-[#222222] mb-4">{t({ en: 'What needs attention?', fr: 'De quoi s\'occuper ?' })}</h3>
                    <div className="space-y-4">
                        {gardeningTypes.map((item) => {
                            const isSelected = (data.subServices || []).includes(item.id) ||
                                (item.id === 'maintenance' && (data.subServices || []).some((id: string) => ['weeding', 'watering'].includes(id)));

                            return (
                                <div
                                    key={item.id}
                                    className={`relative rounded-[5px] border transition-all duration-300 ${isSelected
                                        ? 'border-black border-[1px] bg-white'
                                        : 'border-neutral-200 hover:border-black bg-white'
                                        }`}
                                >
                                    <button
                                        onClick={() => {
                                            if (item.id === 'maintenance') {
                                                const current = data.subServices || [];
                                                const hasAny = current.some((id: string) => ['weeding', 'watering'].includes(id));
                                                if (hasAny) {
                                                    onChange({ subServices: current.filter((id: string) => id !== 'weeding' && id !== 'watering') });
                                                } else {
                                                    onChange({ subServices: [...current, 'weeding'] });
                                                }
                                            } else {
                                                toggleSubService(item.id);
                                            }
                                        }}
                                        className="w-full flex items-center justify-between px-10 py-12 text-left"
                                    >
                                        <div className="flex-1 pr-20">
                                            <span className="text-[23px] font-bold text-[#222222] leading-tight block">
                                                {t({ en: item.label, fr: item.fr })}
                                            </span>
                                        </div>
                                        <div className="shrink-0 text-4xl">
                                            {item.emoji}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-5 right-5 w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>

                                    {isSelected && item.hasMower && (
                                        <div className="px-10 pb-10 pt-2 border-t border-neutral-50">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Should bring mower?', fr: 'Doit apporter la tondeuse ?' })}</span>
                                                    <span className="text-[14px] text-neutral-500">{t({ en: 'Check if you don\'t have one on-site', fr: 'Cochez si vous n\'en avez pas sur place' })}</span>
                                                </div>
                                                <button
                                                    onClick={() => onChange({ shouldBringMower: !data.shouldBringMower })}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${data.shouldBringMower ? 'bg-black' : 'bg-neutral-200'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white transition-all ${data.shouldBringMower ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {isSelected && item.hasTreeSpecs && (
                                        <div className="px-10 pb-10 pt-2 border-t border-neutral-50 space-y-6">
                                            <div className="p-6 rounded-[5px] border border-neutral-100 bg-neutral-50/50 space-y-4">
                                                <CounterRow
                                                    label={t({ en: 'Number of trees', fr: 'Nombre d\'arbres' })}
                                                    value={data.treeCount || 0}
                                                    onChange={(val) => onChange({ treeCount: val })}
                                                    min={0}
                                                />
                                                <CounterRow
                                                    label={t({ en: 'Avg. Tree Height (m)', fr: 'Haut. moyenne (m)' })}
                                                    value={data.averageTreeHeight || 2}
                                                    onChange={(val) => onChange({ averageTreeHeight: val })}
                                                    min={1}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Waste removal included?', fr: 'Évacuation des déchets ?' })}</span>
                                                    <span className="text-[14px] text-neutral-500">{t({ en: 'Remove green waste from the property', fr: 'Évacuer les déchets verts de la propriété' })}</span>
                                                </div>
                                                <button
                                                    onClick={() => onChange({ isWasteRemovalIncluded: !data.isWasteRemovalIncluded })}
                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${data.isWasteRemovalIncluded ? 'bg-black' : 'bg-neutral-200'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full bg-white transition-all ${data.isWasteRemovalIncluded ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <AnimatePresence>
                                        {isSelected && item.hasSubOptions && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-10 pb-10 pt-2 border-t border-neutral-50">
                                                    <div className="flex flex-wrap gap-3">
                                                        {[
                                                            { id: 'weeding', label: 'Weeding', fr: 'Désherbage' },
                                                            { id: 'watering', label: 'Watering', fr: 'Arrosage' }
                                                        ].map((sub) => {
                                                            const isSubActive = (data.subServices || []).includes(sub.id);
                                                            return (
                                                                <button
                                                                    key={sub.id}
                                                                    onClick={() => toggleSubService(sub.id)}
                                                                    className={`px-6 py-3 rounded-full text-[14px] transition-all border ${isSubActive
                                                                        ? 'border-black bg-white text-black font-bold'
                                                                        : 'border-neutral-200 hover:border-black bg-white font-bold'
                                                                        }`}
                                                                >
                                                                    {t({ en: sub.label, fr: sub.fr })}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-medium text-[20px] text-black mb-4">{t({ en: 'Frequency', fr: 'Fréquence' })}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'week', label: 'Weekly', fr: 'Hebdo' },
                            { id: 'biweek', label: 'Bi-weekly', fr: 'Quinzaine' },
                            { id: 'month', label: 'Monthly', fr: 'Mensuel' }
                        ].map((freq: any) => (
                            <button
                                key={freq.id}
                                onClick={() => onChange({ frequency: freq.id })}
                                className={`p-4 rounded-full border text-center transition-all ${data.frequency === freq.id
                                    ? 'border-black border-[2px] bg-neutral-50'
                                    : 'border-neutral-200 hover:border-black bg-white'
                                    }`}
                            >
                                <span className="text-[15px] font-semibold">{t({ en: freq.label, fr: freq.fr })}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-medium text-[20px] text-black mb-4">{t({ en: 'Maintenance Checklist', fr: 'Checklist d\'entretien' })}</h3>
                    <div className="space-y-2">
                        {(data.checklist || ['']).map((item: any, idx: number) => (
                            <div key={idx} className="group flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                    {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <input
                                    type="text"
                                    autoFocus={idx > 0 && item === ''}
                                    value={item}
                                    onChange={(e) => {
                                        const next = [...(data.checklist || [''])];
                                        next[idx] = e.target.value;
                                        onChange({ checklist: next });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && item.trim() !== '') {
                                            onChange({ checklist: [...(data.checklist || []), ''] });
                                        }
                                    }}
                                    placeholder={t({ en: 'e.g., Water the roses...', fr: 'ex: Arroser les roses...' })}
                                    className="flex-1 py-2 bg-transparent border-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300 outline-none"
                                />
                                {((data.checklist || []).length > 1 || item.trim() !== '') && (
                                    <button
                                        onClick={() => {
                                            const next = (data.checklist || []).filter((_: any, i: number) => i !== idx);
                                            onChange({ checklist: next.length === 0 ? [''] : next });
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => onChange({ checklist: [...(data.checklist || []), ''] })}
                            className="flex items-center gap-2 text-black/50 hover:text-black transition-all pt-2"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-medium">{t({ en: 'Add item', fr: 'Ajouter un élément' })}</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-medium text-[20px] text-black">{t({ en: 'Reference Photos', fr: 'Photos de référence' })}</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {(data.referencePhotos || []).map((url: string, idx: number) => (
                            <div key={idx} className="relative aspect-square rounded-[5px] overflow-hidden bg-neutral-100 group">
                                <img src={url} alt="Garden spec" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => {
                                        const next = (data.referencePhotos || []).filter((_: any, i: number) => i !== idx);
                                        onChange({ referencePhotos: next });
                                    }}
                                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => photoInputRef.current?.click()}
                            disabled={isUploading}
                            className="aspect-square rounded-[5px] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-neutral-50 transition-all group"
                        >
                            {isUploading ? (
                                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Camera size={24} className="text-neutral-400 group-hover:text-black transition-all" />
                                    <span className="text-xs font-medium text-neutral-500 group-hover:text-black">{t({ en: 'Add photos', fr: 'Ajouter des photos' })}</span>
                                </>
                            )}
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={photoInputRef}
                        onChange={handlePhotoUpload}
                        className="hidden"
                        multiple
                        accept="image/*"
                    />
                </div>
            </div>
        </div>
    );
};

const PoolSection = ({ id, title, expandedSection, setExpandedSection, children }: any) => {
    const isOpen = expandedSection === id;
    return (
        <div className={`relative rounded-[5px] border transition-all duration-300 ${isOpen ? 'border-black border-[1px] bg-white shadow-sm' : 'border-neutral-200 hover:border-black bg-white'}`}>
            <button
                onClick={() => setExpandedSection(isOpen ? null : id)}
                className="w-full flex items-center justify-between px-10 py-10 text-left"
            >
                <span className="text-[23px] font-bold text-[#222222]">{title}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <ChevronDown size={24} className="text-neutral-400" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-10 pb-10 pt-2 border-t border-neutral-50 space-y-8">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PoolDetailForm = ({ data, onChange, onUploadingChange }: any) => {
    const { t } = useLanguage();
    const photoInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('specs');

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setIsUploading(true);
        onUploadingChange?.(true);
        try {
            const uploadPromises = files.map(async (file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        try {
                            const url = await uploadToCloudinary(
                                reader.result as string,
                                `lbricol/properties/pool`,
                                'lbricol_portfolio'
                            );
                            resolve(url);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });
            const urls = await Promise.all(uploadPromises);
            onChange({ referencePhotos: [...(data.referencePhotos || []), ...urls] });
        } catch (error) {
            console.error('Error uploading photos:', error);
        } finally {
            setIsUploading(false);
            onUploadingChange?.(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            <h2 className="font-bold text-[32px] text-[#222222] leading-tight tracking-tight mb-8">
                {t({ en: 'Pool Cleaning', fr: 'Entretien Piscine' })}
            </h2>

            <div className="space-y-4">
                <PoolSection id="specs" title={t({ en: 'Pool Specifications', fr: 'Caractéristiques de la piscine' })} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                    <div className="space-y-4">
                        <label className="text-[17px] font-medium text-[#222222] mb-4 block">{t({ en: 'Pool Type', fr: 'Type de piscine' })}</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'outdoor', label: 'Outdoor', fr: 'Extérieure' },
                                { id: 'indoor', label: 'Indoor', fr: 'Intérieure' }
                            ].map((type: any) => (
                                <button
                                    key={type.id}
                                    onClick={() => onChange({ poolType: type.id })}
                                    className={`p-4 rounded-full border text-center transition-all ${data.poolType === type.id
                                        ? 'border-black border-[1px] bg-neutral-50'
                                        : 'border-neutral-200 hover:border-black bg-white'
                                        }`}
                                >
                                    <span className="text-[14px] font-semibold text-[#222222]">{t({ en: type.label, fr: type.fr })}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[17px] font-medium text-[#222222] mb-4 block">{t({ en: 'Pool Size', fr: 'Taille de la piscine' })}</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'small', label: 'Small', fr: 'Petite', sub: '< 20m²' },
                                { id: 'medium', label: 'Medium', fr: 'Moyenne', sub: '20-40m²' },
                                { id: 'large', label: 'Large', fr: 'Grande', sub: '40-80m²' },
                                { id: 'estate', label: 'Estate', fr: 'Très grande', sub: '> 80m²' }
                            ].map((size: any) => (
                                <button
                                    key={size.id}
                                    onClick={() => onChange({ poolSize: size.id })}
                                    className={`p-4 rounded-[5px] border text-left transition-all ${data.poolSize === size.id
                                        ? 'border-black border-[1px] bg-white'
                                        : 'border-neutral-200 hover:border-black bg-white'
                                        }`}
                                >
                                    <span className="font-bold text-[16px] text-black block">{t({ en: size.label, fr: size.fr })}</span>
                                    <span className="text-[14px] text-neutral-500">{size.sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 p-6 rounded-[5px] border border-neutral-100 bg-neutral-50/50">
                        <CounterRow
                            label={t({ en: 'Average Depth (m)', fr: 'Profondeur moyenne (m)' })}
                            value={data.poolDepth || 1.5}
                            onChange={(val: number) => onChange({ poolDepth: val })}
                            min={0.5}
                        />
                    </div>
                </PoolSection>

                <PoolSection id="system" title={t({ en: 'System & Locations', fr: 'Système et Emplacements' })} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                    <div className="space-y-4">
                        <label className="text-[17px] font-medium text-[#222222] mb-4 block">{t({ en: 'Water System', fr: 'Système de traitement' })}</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'chlorine', label: 'Chlorine', fr: 'Chlore' },
                                { id: 'saltwater', label: 'Saltwater', fr: 'Au sel' }
                            ].map((system: any) => (
                                <button
                                    key={system.id}
                                    onClick={() => onChange({ poolWaterType: system.id })}
                                    className={`p-4 rounded-[5px] border text-center transition-all ${data.poolWaterType === system.id
                                        ? 'border-black border-[1px] bg-neutral-50'
                                        : 'border-neutral-200 hover:border-black bg-white'
                                        }`}
                                >
                                    <span className="text-[14px] font-medium text-[#222222]">{t({ en: system.label, fr: system.fr })}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                        <div>
                            <label className="text-[17px] font-medium text-[#222222] mb-4 block">{t({ en: 'Technical Room Location', fr: 'Emplacement du local technique' })}</label>
                            <input
                                type="text"
                                value={data.technicalRoomLocation || ''}
                                onChange={(e) => onChange({ technicalRoomLocation: e.target.value })}
                                placeholder={t({ en: 'e.g. Small shed behind the pool, key is...', fr: 'ex: Cabanon derrière la piscine, la clé est...' })}
                                className="w-full p-5 rounded-[5px] bg-[#F7F7F7] border-none focus:ring-2 focus:ring-black focus:border-black text-[16px] transition-all placeholder:text-neutral-400"
                            />
                        </div>
                        <div>
                            <label className="text-[17px] font-medium text-[#222222] mb-4 block">{t({ en: 'Supplies Location', fr: 'Emplacement des produits' })}</label>
                            <input
                                type="text"
                                value={data.suppliesLocation || ''}
                                onChange={(e) => onChange({ suppliesLocation: e.target.value })}
                                placeholder={t({ en: 'e.g. Inside the technical room on the top shelf', fr: 'ex: Dans le local technique sur l\'étagère du haut' })}
                                className="w-full p-5 rounded-[5px] bg-[#F7F7F7] border-none focus:ring-2 focus:ring-black focus:border-black text-[16px] transition-all placeholder:text-neutral-400"
                            />
                        </div>
                    </div>
                </PoolSection>

                <PoolSection id="tasks" title={t({ en: 'Tasks & Reporting', fr: 'Tâches et Rapports' })} expandedSection={expandedSection} setExpandedSection={setExpandedSection}>
                    <div className="space-y-4">
                        <label className="text-[17px] font-medium text-[#222222] mb-4 block">{t({ en: 'Cleaning Frequency', fr: 'Fréquence de nettoyage' })}</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'week', label: 'Weekly', fr: 'Hebdo' },
                                { id: 'two_weeks', label: 'Bi-weekly', fr: 'Bi-mensuel' },
                                { id: 'month', label: 'Monthly', fr: 'Mensuel' }
                            ].map((freq: any) => (
                                <button
                                    key={freq.id}
                                    onClick={() => onChange({ frequency: freq.id })}
                                    className={`p-4 rounded-[5px] border text-center transition-all ${data.frequency === freq.id
                                        ? 'border-black border-[2px] bg-neutral-50'
                                        : 'border-neutral-200 text-black hover:border-black'
                                        }`}
                                >
                                    <span className="text-[14px] font-medium text-[#222222]">{t({ en: freq.label, fr: freq.fr })}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                        <label className="text-[17px] font-medium text-[#222222] mb-1 block">{t({ en: 'Required Tasks Checklist', fr: 'Checklist des tâches obligatoires' })}</label>
                        <p className="text-[14px] text-neutral-500 mb-6">
                            {t({ en: 'Bricoler must verify these steps to complete the job', fr: 'Le Bricoler doit vérifier ces étapes pour terminer' })}
                        </p>
                        <div className="space-y-2">
                            {(data.checklist || ['']).map((item: any, idx: number) => (
                                <div key={idx} className="group flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                        {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </div>
                                    <input
                                        type="text"
                                        autoFocus={idx > 0 && item === ''}
                                        value={item}
                                        onChange={(e) => {
                                            const next = [...(data.checklist || [''])];
                                            next[idx] = e.target.value;
                                            onChange({ checklist: next });
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && item.trim() !== '') {
                                                onChange({ checklist: [...(data.checklist || []), ''] });
                                            }
                                        }}
                                        placeholder={t({ en: 'e.g., Chemical balancing, vacuuming, filter check...', fr: 'ex: Équilibrage chimique, passage de l\'aspirateur...' })}
                                        className="flex-1 py-2 bg-transparent border-none focus:ring-0 text-[16px] text-[#222222] placeholder:text-neutral-300 outline-none"
                                    />
                                    {((data.checklist || []).length > 1 || item.trim() !== '') && (
                                        <button
                                            onClick={() => {
                                                const next = (data.checklist || []).filter((_: any, i: number) => i !== idx);
                                                onChange({ checklist: next.length === 0 ? [''] : next });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 transition-all"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => onChange({ checklist: [...(data.checklist || []), ''] })}
                                className="flex items-center gap-2 text-black/50 hover:text-black transition-all pt-2"
                            >
                                <Plus size={18} />
                                <span className="text-sm font-medium">{t({ en: 'Add task', fr: 'Ajouter une tâche' })}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                        <div>
                            <label className="text-[17px] font-medium text-[#222222]">{t({ en: 'Proof of Completion Photos', fr: 'Photos de preuve de réalisation' })}</label>
                            <p className="text-[14px] text-neutral-500 mt-1 mb-4">
                                {t({ en: 'Upload examples of expected water clarity and chemical levels', fr: 'Téléchargez des exemples de la clarté d\'eau attendue' })}
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {(data.referencePhotos || []).map((url: any, i: number) => (
                                <div key={url} className="relative aspect-square rounded-[5px] overflow-hidden border border-neutral-100 group">
                                    <img src={url} alt="Reference" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => onChange({ referencePhotos: data.referencePhotos.filter((_: any, idx: number) => idx !== i) })}
                                        className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-neutral-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-white"
                                    >
                                        <X size={14} className="text-red-500" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => photoInputRef.current?.click()}
                                className="aspect-square rounded-[5px] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 hover:border-black hover:bg-neutral-50 transition-all text-neutral-400 hover:text-black"
                            >
                                {isUploading ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                        <Plus size={24} />
                                    </motion.div>
                                ) : (
                                    <>
                                        <Plus size={24} />
                                        <span className="text-[12px] font-medium uppercase tracking-wider">{t({ en: 'Upload', fr: 'Ajouter' })}</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <input type="file" multiple hidden ref={photoInputRef} onChange={handlePhotoUpload} accept="image/*" />
                    </div>
                </PoolSection>
            </div>
        </div>
    );
};

const ReceptionistDetailForm = ({ data, onChange }: any) => {
    const { t } = useLanguage();

    return (
        <div className="flex-1 overflow-y-auto pb-32">
            <h2 className="font-medium text-[32px] text-black leading-tight tracking-tight mb-8">
                {t({ en: 'Guest Receptionist', fr: 'Accueil des Voyageurs' })}
            </h2>

            <div className="space-y-12">


                <div className="space-y-4">
                    <h3 className="font-medium text-[20px] text-black mb-4">{t({ en: 'Welcome Tasks', fr: 'Tâches d\'accueil' })}</h3>
                    <div className="space-y-2">
                        {(data.checklist || ['']).map((item: any, idx: number) => (
                            <div key={idx} className="group flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                    {item.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <input
                                    type="text"
                                    autoFocus={idx > 0 && item === ''}
                                    value={item}
                                    onChange={(e) => {
                                        const next = [...(data.checklist || [''])];
                                        next[idx] = e.target.value;
                                        onChange({ checklist: next });
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && item.trim() !== '') {
                                            onChange({ checklist: [...(data.checklist || []), ''] });
                                        }
                                    }}
                                    placeholder={t({ en: 'e.g., Show how WiFi works...', fr: 'ex: Expliquer le WiFi...' })}
                                    className="flex-1 py-2 bg-transparent border-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300 outline-none"
                                />
                                {((data.checklist || []).length > 1 || item.trim() !== '') && (
                                    <button
                                        onClick={() => {
                                            const next = (data.checklist || []).filter((_: any, i: number) => i !== idx);
                                            onChange({ checklist: next.length === 0 ? [''] : next });
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 transition-all"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => onChange({ checklist: [...(data.checklist || []), ''] })}
                            className="flex items-center gap-2 text-black/50 hover:text-black transition-all pt-2"
                        >
                            <Plus size={18} />
                            <span className="text-sm font-medium">{t({ en: 'Add item', fr: 'Ajouter un élément' })}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PetsDetailForm = ({ data, onChange }: any) => {
    const { t } = useLanguage();

    const petTypesConfig = [
        { id: 'dog', label: 'Dog', fr: 'Chien', emoji: '🐶', hasWalking: true, hasMedication: true },
        { id: 'cat', label: 'Cat', fr: 'Chat', emoji: '🐱', hasWalking: false, hasMedication: true },
        { id: 'guard_dog', label: 'Guard Dog', fr: 'Chien de garde', emoji: '🐕', hasWalking: true, hasMedication: true },
        { id: 'bird', label: 'Bird', fr: 'Oiseau', emoji: '🦜', hasWalking: false, hasMedication: true },
        { id: 'other', label: 'Other', fr: 'Autre', emoji: '🐾', hasWalking: false, hasMedication: true }
    ];

    const togglePetType = (id: string) => {
        const current = data.petTypes || [];
        const next = current.includes(id) ? current.filter((s: any) => s !== id) : [...current, id];

        // Initialize detail state for new pet if it doesn't exist
        const nextDetails = { ...(data.petDetails || {}) };
        if (!current.includes(id) && !nextDetails[id]) {
            nextDetails[id] = {
                name: '',
                feedingFrequency: 'twice',
                walkingNeeded: false,
                medicationRequired: false,
                checklist: ['']
            };
        }

        onChange({ petTypes: next, petDetails: nextDetails });
    };

    const updatePetDetail = (id: string, updates: any) => {
        const nextDetails = { ...(data.petDetails || {}) };
        nextDetails[id] = { ...(nextDetails[id] || {}), ...updates };
        onChange({ petDetails: nextDetails });
    };

    const feedingFrequencies = [
        { id: 'once', label: 'Once / Day', fr: '1 fois / jour' },
        { id: 'twice', label: 'Twice / Day', fr: '2 fois / jour' },
        { id: 'three', label: '3 times / Day', fr: '3 fois / jour' },
        { id: 'custom', label: 'Custom', fr: 'Sur-mesure' }
    ];

    return (
        <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            <h2 className="font-bold text-[32px] text-[#222222] leading-tight tracking-tight mb-8">
                {t({ en: 'Pets Care', fr: 'Soins des Animaux' })}
            </h2>

            <div className="space-y-12">
                {/* Pets Selection & Details */}
                <div className="space-y-6">
                    <h3 className="text-[17px] font-medium text-[#222222]">{t({ en: 'What type of pets need care?', fr: 'Quel type d\'animaux a besoin de soins ?' })}</h3>
                    <div className="space-y-4">
                        {petTypesConfig.map((item) => {
                            const isSelected = (data.petTypes || []).includes(item.id);
                            const details = (data.petDetails || {})[item.id] || { name: '', feedingFrequency: 'twice', checklist: [''] };

                            return (
                                <div
                                    key={item.id}
                                    className={`relative rounded-[5px] border transition-all duration-300 ${isSelected
                                        ? 'border-black border-[1px] bg-white shadow-sm'
                                        : 'border-neutral-200 hover:border-black bg-white'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-5 right-5 w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center z-10">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => togglePetType(item.id)}
                                        className="w-full flex items-center justify-between px-10 py-12 text-left"
                                    >
                                        <div className="flex-1 pr-20">
                                            <span className="text-[23px] font-bold text-[#222222] leading-tight block">
                                                {t({ en: item.label, fr: item.fr })}
                                            </span>
                                            {isSelected && details.name && (
                                                <span className="text-[15px] text-neutral-500 mt-1 block font-medium">
                                                    {details.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="shrink-0 flex items-center gap-4">
                                            <div className="text-4xl">{item.emoji}</div>
                                            <motion.div
                                                animate={{ rotate: isSelected ? 180 : 0 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            >
                                                <ChevronDown size={24} className="text-neutral-400" />
                                            </motion.div>
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isSelected && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-10 pb-10 pt-2 border-t border-neutral-50 space-y-8">
                                                    {/* Animal Name */}
                                                    <div className="space-y-3 mt-4">
                                                        <label className="text-[17px] font-medium block mb-3 text-[#222222]">{t({ en: 'Animal Name', fr: 'Nom de l\'animal' })}</label>
                                                        <input
                                                            type="text"
                                                            value={details.name || ''}
                                                            onChange={(e) => updatePetDetail(item.id, { name: e.target.value })}
                                                            placeholder={t({ en: 'e.g. Max, Luna...', fr: 'ex: Max, Luna...' })}
                                                            className="w-full p-5 rounded-[5px] bg-[#F7F7F7] border-none focus:ring-2 focus:ring-black focus:border-black text-[16px] transition-all placeholder:text-neutral-400"
                                                        />
                                                    </div>

                                                    {/* Feeding Frequency */}
                                                    <div className="space-y-4">
                                                        <label className="text-[17px] font-medium block mb-3 text-[#222222]">{t({ en: 'Feeding Frequency', fr: 'Fréquence des repas (par jour)' })}</label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {feedingFrequencies.map((freq) => (
                                                                <button
                                                                    key={freq.id}
                                                                    onClick={() => updatePetDetail(item.id, { feedingFrequency: freq.id })}
                                                                    className={`p-4 rounded-[5px] border text-left transition-all ${details.feedingFrequency === freq.id
                                                                        ? 'border-black border-[1px] bg-white'
                                                                        : 'border-neutral-200 hover:border-black bg-white'
                                                                        }`}
                                                                >
                                                                    <span className="font-bold text-[15px] text-black">{t({ en: freq.label, fr: freq.fr })}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Toggles */}
                                                    <div className="space-y-2">
                                                        {item.hasWalking && (
                                                            <div className="flex items-center justify-between gap-4 py-4">
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Walking needed?', fr: 'Promenades nécessaires ?' })}</span>
                                                                    <span className="text-[14px] text-neutral-500">{t({ en: 'For dogs and active pets', fr: 'Pour les chiens et animaux actifs' })}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updatePetDetail(item.id, { walkingNeeded: !details.walkingNeeded })}
                                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${details.walkingNeeded ? 'bg-black' : 'bg-neutral-200'}`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded-full bg-white transition-all ${details.walkingNeeded ? 'translate-x-6' : 'translate-x-0'}`} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {item.hasMedication && (
                                                            <div className="flex items-center justify-between gap-4 py-4 border-t border-neutral-50">
                                                                <div className="flex flex-col gap-1 flex-1">
                                                                    <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Medication required?', fr: 'Médicaments requis ?' })}</span>
                                                                    <span className="text-[14px] text-neutral-500">{t({ en: 'If the animal has a treatment', fr: 'Si l\'animal suit un traitement' })}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => updatePetDetail(item.id, { medicationRequired: !details.medicationRequired })}
                                                                    className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${details.medicationRequired ? 'bg-black' : 'bg-neutral-200'}`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded-full bg-white transition-all ${details.medicationRequired ? 'translate-x-6' : 'translate-x-0'}`} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Per-Animal Checklist */}
                                                    <div className="space-y-4 pt-4 border-t border-neutral-50">
                                                        <h4 className="text-[17px] font-medium mb-3 text-[#222222]">{t({ en: 'Instructions Checklist', fr: 'Checklist d\'instructions' })}</h4>
                                                        <div className="space-y-2">
                                                            {(details.checklist || ['']).map((itemStr: string, idx: number) => (
                                                                <div key={idx} className="group flex items-center gap-3">
                                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${itemStr.trim() !== '' ? 'bg-[#00CA52] border-[#00CA52]' : 'border-neutral-200'}`}>
                                                                        {itemStr.trim() !== '' && <Check size={12} className="text-white" strokeWidth={3} />}
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        autoFocus={idx > 0 && itemStr === ''}
                                                                        value={itemStr}
                                                                        onChange={(e) => {
                                                                            const next = [...(details.checklist || [''])];
                                                                            next[idx] = e.target.value;
                                                                            updatePetDetail(item.id, { checklist: next });
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && itemStr.trim() !== '') {
                                                                                updatePetDetail(item.id, { checklist: [...(details.checklist || []), ''] });
                                                                            }
                                                                        }}
                                                                        placeholder={t({ en: 'e.g., Clean the litter box...', fr: 'ex: Nettoyer la litière...' })}
                                                                        className="flex-1 py-2 bg-transparent border-none focus:ring-0 text-[18px] text-black placeholder:text-neutral-300 outline-none"
                                                                    />
                                                                    {((details.checklist || []).length > 1 || itemStr.trim() !== '') && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const next = (details.checklist || []).filter((_: any, i: number) => i !== idx);
                                                                                updatePetDetail(item.id, { checklist: next.length === 0 ? [''] : next });
                                                                            }}
                                                                            className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-red-500 transition-all"
                                                                        >
                                                                            <X size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => updatePetDetail(item.id, { checklist: [...(details.checklist || []), ''] })}
                                                                className="flex items-center gap-2 text-black/50 hover:text-black transition-all pt-2"
                                                            >
                                                                <Plus size={18} />
                                                                <span className="text-sm font-medium">{t({ en: 'Add item', fr: 'Ajouter un élément' })}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>


            </div>
        </div>
    );
};

const ErrandsDetailForm = ({ data, onChange }: any) => {
    const { t } = useLanguage();
    const [editingBrand, setEditingBrand] = useState<{ cat: string, idx: number } | null>(null);

    const categories = [
        { id: 'toiletries', label: 'Toiletries', fr: 'Articles de toilette', emoji: '🧻' },
        { id: 'cleaning', label: 'Cleaning Products', fr: 'Produits d\'entretien', emoji: '🧹' },
        { id: 'pantry', label: 'Pantry & Breakfast', fr: 'Garde-manger & Petit-déj', emoji: '☕' },
        { id: 'linens', label: 'Linens & Towels', fr: 'Linge & Serviettes', emoji: '🛏️' }
    ];

    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const toggleCategory = (id: string) => {
        const current = data.categories || [];
        const isSelected = current.includes(id);

        if (isSelected) {
            // If already selected, just toggle expansion
            setExpandedCategory(expandedCategory === id ? null : id);
        } else {
            // If not selected, select it and expand it
            onChange({
                categories: [...current, id],
                checklists: {
                    ...(data.checklists || {}),
                    [id]: (data.checklists && data.checklists[id]) || [{ name: '', minStock: 1, maxStock: 5, frequency: 'each_time' }]
                }
            });
            setExpandedCategory(id);
        }
    };

    const updateChecklist = (catId: string, newList: any[]) => {
        const currentChecklists = data.checklists || {};
        onChange({ checklists: { ...currentChecklists, [catId]: newList } });
    };

    return (
        <div className="flex-1 overflow-y-auto pb-32">
            <h2 className="font-medium text-[36px] text-black leading-tight tracking-tight mb-8">
                {t({ en: 'What needs restocking?', fr: 'Que faut-il réapprovisionner ?' })}
            </h2>

            <div className="space-y-6">
                {categories.map((category) => {
                    const isSelected = (data.categories || []).includes(category.id);
                    const isExpanded = expandedCategory === category.id;
                    const list = (data.checklists && data.checklists[category.id]) || [{ name: '', minStock: 1, maxStock: 5, frequency: 'each_time' }];
                    const hasValidItem = list.some((item: any) => item.name && item.name.trim() !== '');

                    return (
                        <div
                            key={category.id}
                            className={`relative rounded-[5px] border transition-all duration-300 ${isExpanded
                                ? 'border-black border-[1px] bg-white shadow-sm'
                                : 'border-neutral-200 hover:border-black bg-white'
                                }`}
                        >
                            {isSelected && hasValidItem && (
                                <div className="absolute top-5 right-5 w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center z-10">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 12L10 18L20 6" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}

                            <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full flex items-center justify-between px-10 py-12 text-left"
                            >
                                <div className="flex-1 pr-20">
                                    <span className="text-[23px] font-bold text-[#222222] leading-tight block">
                                        {t({ en: category.label, fr: category.fr })}
                                    </span>
                                </div>
                                <div className="shrink-0 flex items-center gap-4">
                                    <div className="text-4xl">{category.emoji}</div>
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 180 : 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    >
                                        <ChevronDown size={24} className="text-neutral-400" />
                                    </motion.div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-5 pb-10 pt-2 border-t border-neutral-50 space-y-6">
                                            <div className="flex flex-col gap-4">
                                                {list.map((item: any, idx: number) => (
                                                    <div key={idx} className="border border-neutral-200 p-5 rounded-[5px] bg-white space-y-4">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <div className="flex flex-col gap-3 flex-1">
                                                                <input
                                                                    type="text"
                                                                    autoFocus={idx > 0 && item.name === ''}
                                                                    value={item.name}
                                                                    onChange={(e) => {
                                                                        const newList = [...list];
                                                                        newList[idx].name = e.target.value;
                                                                        updateChecklist(category.id, newList);
                                                                    }}
                                                                    placeholder={t({ en: 'Item name...', fr: 'Nom de l\'article...' })}
                                                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-[18px] text-black font-medium placeholder:text-neutral-300 outline-none"
                                                                />
                                                                <div className="flex flex-wrap gap-2">
                                                                    {(item.brands || []).map((brand: any) => (
                                                                        <span key={brand} className="inline-flex items-center gap-1 px-3 py-1 bg-[#F7F7F7] text-neutral-600 rounded-[5px] text-[13px] font-medium border border-neutral-200">
                                                                            {brand}
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newList = [...list];
                                                                                    newList[idx].brands = item.brands.filter((b: any) => b !== brand);
                                                                                    updateChecklist(category.id, newList);
                                                                                }}
                                                                                className="ml-1 text-neutral-400 hover:text-black"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <div className="flex flex-col gap-2 mt-4">
                                                                    <span className="text-[13px] font-medium text-neutral-400 uppercase tracking-wider">
                                                                        {t({ en: 'Preferred Supplier', fr: 'Fournisseur préféré' })}
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={item.preferredSupplier || ''}
                                                                        onChange={(e) => {
                                                                            const newList = [...list];
                                                                            newList[idx].preferredSupplier = e.target.value;
                                                                            updateChecklist(category.id, newList);
                                                                        }}
                                                                        placeholder={t({ en: 'e.g. Marjane, Carrefour...', fr: 'ex. Marjane, Carrefour...' })}
                                                                        className="w-full bg-[#F7F7F7] rounded-[5px] px-4 py-3 text-[15px] text-black border-none focus:ring-1 focus:ring-black transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => updateChecklist(category.id, list.filter((_: any, i: number) => i !== idx))}
                                                                className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <X size={20} />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-6 pt-4 border-t border-neutral-50">


                                                            {/* Min/Max Stock Counters */}
                                                            <div className="grid grid-cols-1 gap-6">
                                                                <div className="space-y-3">
                                                                    <span className="text-[14px] font-medium text-neutral-400 uppercase tracking-wider">{t({ en: 'Min Stock', fr: 'Stock Min' })}</span>
                                                                    <div className="flex items-center gap-8">
                                                                        <button
                                                                            onClick={() => {
                                                                                const newList = [...list];
                                                                                newList[idx].minStock = Math.max(0, (item.minStock || 1) - 1);
                                                                                updateChecklist(category.id, newList);
                                                                            }}
                                                                            className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center active:scale-90 transition-all text-black disabled:opacity-20"
                                                                            disabled={(item.minStock || 0) <= 0}
                                                                        >
                                                                            <div className="w-3 h-[1.5px] bg-black" />
                                                                        </button>
                                                                        <span className="text-[17px] font-bold tabular-nums w-4 text-center">{item.minStock || 1}</span>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newList = [...list];
                                                                                newList[idx].minStock = (item.minStock || 0) + 1;
                                                                                updateChecklist(category.id, newList);
                                                                            }}
                                                                            className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center active:scale-90 transition-all text-black"
                                                                        >
                                                                            <Plus size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    <span className="text-[14px] font-medium text-neutral-400 uppercase tracking-wider">{t({ en: 'Max Stock', fr: 'Stock Max' })}</span>
                                                                    <div className="flex items-center gap-8">
                                                                        <button
                                                                            onClick={() => {
                                                                                const newList = [...list];
                                                                                newList[idx].maxStock = Math.max((item.minStock || 0), (item.maxStock || 5) - 1);
                                                                                updateChecklist(category.id, newList);
                                                                            }}
                                                                            className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center active:scale-90 transition-all text-black disabled:opacity-20"
                                                                            disabled={(item.maxStock || 0) <= (item.minStock || 0)}
                                                                        >
                                                                            <div className="w-3 h-[1.5px] bg-black" />
                                                                        </button>
                                                                        <span className="text-[17px] font-bold tabular-nums w-4 text-center">{item.maxStock || 5}</span>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newList = [...list];
                                                                                newList[idx].maxStock = (item.maxStock || 0) + 1;
                                                                                updateChecklist(category.id, newList);
                                                                            }}
                                                                            className="w-10 h-10 rounded-full border border-neutral-200 flex items-center justify-center active:scale-90 transition-all text-black"
                                                                        >
                                                                            <Plus size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => updateChecklist(category.id, [...list, { name: '', minStock: 1, maxStock: 5, frequency: 'each_time' }])}
                                                    className="mt-2 inline-flex items-center gap-3 text-[16px] text-neutral-500 hover:text-black font-medium transition-colors"
                                                >
                                                    <span className="w-8 h-8 rounded-full border border-dashed border-neutral-300 flex items-center justify-center">
                                                        <Plus size={14} />
                                                    </span>
                                                    {t({ en: 'Add item', fr: 'Ajouter un article' })}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {(data.categories || []).length > 0 && (
                    <div className="pt-10 space-y-12 border-t border-neutral-100">
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[17px] font-medium text-black mb-2 block">
                                    {t({ en: 'Where do you store your supplies?', fr: 'Où stockez-vous vos fournitures ?' })}
                                </span>
                                <span className="text-[14px] text-neutral-400 font-medium">
                                    {t({ en: 'Help the Bricoleur find and restock items in the right place.', fr: 'Aidez le Bricoleur à trouver et ranger les articles au bon endroit.' })}
                                </span>
                            </div>
                            <textarea
                                value={data.storageLocation || ''}
                                onChange={(e) => onChange({ storageLocation: e.target.value })}
                                rows={4}
                                placeholder={t({
                                    en: 'ex. Toiletries in the cabinet under the sink...',
                                    fr: 'ex. Articles de toilette dans le meuble sous l\'évier...'
                                })}
                                className="w-full resize-none bg-[#F7F7F7] rounded-[5px] px-6 py-5 text-[16px] text-black border-none focus:ring-2 focus:ring-black transition-all"
                            />
                        </div>


                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[17px] font-medium text-black mb-2 block">
                                    {t({ en: 'General Instructions', fr: 'Instructions générales' })}
                                </span>
                                <span className="text-[14px] text-neutral-400 font-medium">
                                    {t({ en: 'Any specific instructions for shopping or restocking?', fr: 'Des instructions spécifiques pour les courses ou le rangement ?' })}
                                </span>
                            </div>
                            <textarea
                                value={data.instructions || ''}
                                onChange={(e) => onChange({ instructions: e.target.value })}
                                rows={4}
                                placeholder={t({
                                    en: 'ex. Only buy organic milk, check for expiration dates...',
                                    fr: 'ex. Acheter uniquement du lait bio, vérifier les dates de péremption...'
                                })}
                                className="w-full resize-none bg-[#F7F7F7] rounded-[5px] px-6 py-5 text-[16px] text-black border-none focus:ring-2 focus:ring-black transition-all"
                            />
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
};
