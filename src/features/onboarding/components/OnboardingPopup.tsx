"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CheckCircle2, Search, ChevronLeft, ChevronRight, FileText, Info, Plus, Minus, MapPin, ArrowRight, TrendingUp, User, Wrench, Save, Star, Key, Sparkles, Image, Globe, Camera, Fingerprint, ScanEye, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { CldUploadWidget, CldImage } from 'next-cloudinary';
import {
    collection,
    query,
    where,
    getDocs,
    limit,
    writeBatch,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    deleteDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FcGoogle } from 'react-icons/fc';
import { getAllServices, getServiceVector, type ServiceConfig } from '@/config/services_config';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS, SERVICE_TIER_RATES } from '@/config/moroccan_areas';
import { useToast } from '@/context/ToastContext';
import { writeCityIndex } from '@/lib/cityIndex';
import { useLanguage } from '@/context/LanguageContext';
import SplashScreen from '@/components/layout/SplashScreen';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { isImageDataUrl, compressImageFileToDataUrl, dataUrlToBlob } from '@/lib/imageCompression';
import { CAR_BRANDS } from '@/config/cars_config';
import { translateBio } from '@/lib/translateBio';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
import LocationPicker from '@/components/location-picker/LocationPicker';

interface OnboardingPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: any) => void;
    mode?: 'onboarding' | 'edit' | 'add' | 'admin_add' | 'admin_edit';
    initialCategory?: any;
    userData?: any;
}

interface CategoryDetail {
    categoryId: string;
    categoryName: string;
    hourlyRate: number;
    pitch: string;
    experience: string;
    equipments: string[];
    noEquipment: boolean;
    portfolioImages: string[];
    spokenLanguages?: string[];
}

const ALL_SERVICES = getAllServices();
const MIN_PITCH_CHARS = 50;

// ── Animation Variants ──────────────────────────────────────────────────────
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 30 : -30,
        opacity: 0,
        filter: 'blur(4px)',
        scale: 0.98
    }),
    center: {
        x: 0,
        opacity: 1,
        filter: 'blur(0px)',
        scale: 1,
        transition: {
            x: { type: "spring", stiffness: 400, damping: 30 },
            opacity: { duration: 0.2 },
            staggerChildren: 0.05
        }
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 30 : -30,
        opacity: 0,
        filter: 'blur(4px)',
        scale: 0.98,
        transition: {
            x: { type: "spring", stiffness: 400, damping: 30 },
            opacity: { duration: 0.2 }
        }
    })
} as any;

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 400, damping: 30 }
    }
} as any;



// ── Equipment suggestions per service ───────────────────────────────────────
const SERVICE_EQUIPMENT_SUGGESTIONS: Record<string, { en: string; fr: string; ar: string }[]> = {
    cleaning: [
        { en: "Vacuum cleaner", fr: "Aspirateur", ar: "مكنسة كهربائية" },
        { en: "Steam mop", fr: "Balai vapeur", ar: "ممسحة بالبخار" },
        { en: "Microfiber cloths", fr: "Chiffons microfibres", ar: "أقمشة ميكروفايبر" },
        { en: "Eco cleaning products", fr: "Produits écologiques", ar: "منتجات تنظيف صديقة للبيئة" },
        { en: "Pressure washer", fr: "Nettoyeur haute pression", ar: "منظف بالضغط العالي" },
        { en: "Mop & bucket set", fr: "Serpillère et seau", ar: "مجموعة ممسحة ودلو" }
    ],
    glass_cleaning: [
        { en: "Squeegee & bucket", fr: "Raclette et seau", ar: "ممسحة ودلو" },
        { en: "Deionized water-fed pole", fr: "Perche à eau déminéralisée", ar: "عمود تزويد بالماء منزوع المعادن" },
        { en: "Steam cleaner", fr: "Nettoyeur à vapeur", ar: "منظف بالبخار" },
        { en: "Scrapers (paint/residue)", fr: "Racloirs (peinture/résidus)", ar: "مكشطة (طلاء/رواسب)" },
        { en: "Extension poles", fr: "Perches télescopiques", ar: "أعمدة تمديد" },
        { en: "Microfiber towels", fr: "Serviettes microfibres", ar: "مناشف ميكروفايبر" }
    ],
    plumbing: [
        { en: "Pipe wrench set", fr: "Clé à molette", ar: "مجموعة مفاتيح مواسير" },
        { en: "Drain snake / auger", fr: "Furet de plomberie", ar: "ثعبان المجاري" },
        { en: "Pressure gauge", fr: "Manomètre", ar: "مقياس الضغط" },
        { en: "Soldering kit", fr: "Kit de soudure", ar: "عدة لحام" },
        { en: "Thread sealant tape", fr: "Téflon ruban étanche", ar: "شريط منع التسرب" },
        { en: "Plunger", fr: "Ventouse", ar: "مكبس" }
    ],
    electricity: [
        { en: "Digital multimeter", fr: "Multimètre numérique", ar: "ملتيمتر رقمي" },
        { en: "Wire stripper", fr: "Pince à dénuder", ar: "قاطعة أسلاك" },
        { en: "Power drill", fr: "Perceuse électrique", ar: "مثقاب كهربائي" },
        { en: "Electrical tape", fr: "Ruban isolant", ar: "شريط كهربائي" },
        { en: "Circuit tester", fr: "Testeur de circuit", ar: "مختبر الدارة" },
        { en: "Cable fish tape", fr: "Tire-fils électrique", ar: "شريط سحب الأسلاك" }
    ],
    painting: [
        { en: "Paint rollers & trays", fr: "Rouleaux et bacs à peinture", ar: "بكرات وأحواض الطلاء" },
        { en: "Spray gun", fr: "Pistolet à peinture", ar: "مسدس رش" },
        { en: "Brush set", fr: "Jeux de pinceaux", ar: "مجموعة فراشي" },
        { en: "Masking tape", fr: "Ruban de masquage", ar: "شريط لاصق" },
        { en: "Sandpaper set", fr: "Papier de verre", ar: "مجموعة ورق صنفرة" },
        { en: "Drop cloths", fr: "Bâches de protection", ar: "أغطية حماية" },
        { en: "Ladder", fr: "Échelle", ar: "سلم" }
    ],
    home_repairs: [
        { en: "Power drill", fr: "Perceuse", ar: "مثقاب يدوي" },
        { en: "Screwdriver set", fr: "Jeux de tournevis", ar: "مجموعة مفاتيح" },
        { en: "Level", fr: "Niveau à bulle", ar: "ميزان الماء" },
        { en: "Hammer & nails", fr: "Marteau et clous", ar: "مطرقة ومسامير" },
        { en: "Measuring tape", fr: "Mètre ruban", ar: "شريط قياس" },
        { en: "Jigsaw / circular saw", fr: "Scie sauteuse / circulaire", ar: "منشار آلي" }
    ],
    furniture_assembly: [
        { en: "Allen key set", fr: "Clé Allen", ar: "مفتاح ألين" },
        { en: "Power drill", fr: "Perceuse", ar: "مثقاب" },
        { en: "Rubber mallet", fr: "Maillet en caoutchouc", ar: "مطرقة مطاطية" },
        { en: "Measuring tape", fr: "Mètre", ar: "شريط قياس" },
        { en: "Cable ties", fr: "Colliers de serrage", ar: "أربطة الكابلات" }
    ],
    mounting: [
        { en: "Stud finder", fr: "Détecteur de montants", ar: "كاشف البراغي" },
        { en: "Laser level", fr: "Niveau laser", ar: "ميزان ليزر" },
        { en: "Power drill", fr: "Perceuse", ar: "مثقاب كهربائي" },
        { en: "Wall anchor kit", fr: "Chevilles murales", ar: "عدة مثبتات جدارية" },
        { en: "Cable management clips", fr: "Clips de gestion des câbles", ar: "مشابك تنظيم الكابلات" },
        { en: "VESA mount adapters", fr: "Adaptateurs support VESA", ar: "محولات حامل VESA" }
    ],
    appliance_installation: [
        { en: "Drill & bits", fr: "Perceuse et forets", ar: "مثقاب ولقم" },
        { en: "Pipe wrench", fr: "Clé à tube", ar: "مفتاح أنابيب" },
        { en: "Voltage tester", fr: "Testeur de tension", ar: "مختبر جهد" },
        { en: "Hosepipe connections", fr: "Raccords de tuyau", ar: "وصلات خراطيم" },
        { en: "Teflon tape", fr: "Ruban Téflon", ar: "شريط تيفلون" },
        { en: "Bubble level", fr: "Niveau à bulle", ar: "ميزان ماء" }
    ],
    moving: [
        { en: "Moving blankets", fr: "Couvertures de déménagement", ar: "أغطية حماية للأثاث" },
        { en: "Hand truck / dolly", fr: "Diable / Chariot", ar: "عربة يدوية" },
        { en: "Packing tape", fr: "Ruban d’emballage", ar: "شريط تغليف" },
        { en: "Stretch wrap", fr: "Film étirable", ar: "فيلم تغليف" },
        { en: "Moving straps", fr: "Sangles de levage", ar: "أحزمة حمل" },
        { en: "Furniture sliders", fr: "Patins de déménagement", ar: "منزلقات الأثاث" }
    ],
    gardening: [
        { en: "Lawn mower", fr: "Tondeuse à gazon", ar: "جزازة عشب" },
        { en: "Hedge trimmer", fr: "Taille-haie", ar: "مقص سياج" },
        { en: "Pruning shears", fr: "Sécateurs", ar: "مقص تقليم" },
        { en: "Garden hose", fr: "Tuyau d’arrosage", ar: "خرطوم حديقة" },
        { en: "Rake & shovel set", fr: "Râteau et pelle", ar: "مجرفة ومجراف" },
        { en: "Wheelbarrow", fr: "Brouette", ar: "عربة حديقة" }
    ],
    pool_cleaning: [
        { en: "Pool skimmer / net", fr: "Épuisette / Filet", ar: "شبكة مسبح" },
        { en: "Telescopic pole", fr: "Perche télescopique", ar: "عمود تمديد" },
        { en: "Pool brush set", fr: "Jeu de brosses de piscine", ar: "مجموعة فُرش المسبح" },
        { en: "Water testing kit (DPD)", fr: "Kit de test d’eau (DPD)", ar: "عدة اختبار المياه" },
        { en: "Vacuum head & hose", fr: "Tête d’aspirateur et tuyau", ar: "رأس مكنسة وخرطوم" },
        { en: "Chemical dispenser", fr: "Diffuseur de produits chimiques", ar: "موزع كيميائي" }
    ],
    pets_care: [
        { en: "Leashes & harnesses", fr: "Laisses et harnais", ar: "أطواق ومقاود" },
        { en: "Pet grooming kit", fr: "Kit de toilettage", ar: "عدة تنظيف الحيوانات" },
        { en: "Portable water bowl", fr: "Bol d’eau portable", ar: "وعاء ماء محمول" },
        { en: "Pet first aid kit", fr: "Kit premiers secours animaux", ar: "حقيبة إسعافات أولية للحيوانات" },
        { en: "Waste bags", fr: "Sacs de déchets", ar: "أكياس نفايات" },
        { en: "Pet safe treats", fr: "Friandises pour animaux", ar: "جوائز للحيوانات" }
    ],
    babysitting: [
        { en: "First aid kit", fr: "Kit de premiers secours", ar: "حقيبة إسعافات أولية" },
        { en: "Child safety gear", fr: "Équipement de sécurité enfant", ar: "معدات سلامة الأطفال" },
        { en: "Educational toys", fr: "Jouets éducatifs", ar: "ألعاب تعليمية" },
        { en: "Board games", fr: "Jeux de société", ar: "ألعاب لوحية" },
        { en: "Art & craft supplies", fr: "Fournitures d'art et d'artisanat", ar: "لوازم فنية وأشغال يدوية" },
        { en: "Car seat (for transport)", fr: "Siège auto (pour le transport)", ar: "مقعد سيارة (للنقل)" }
    ],
    elderly_care: [
        { en: "First aid kit", fr: "Kit de premiers secours", ar: "حقيبة إسعافات أولية" },
        { en: "Blood pressure monitor", fr: "Tensiomètre", ar: "جهاز قياس ضغط الدم" },
        { en: "Mobility aids (walker/cane)", fr: "Aides à la mobilité (déambulateur/canne)", ar: "وسائل مساعدة على المشي (مشاية/عصا)" },
        { en: "Medication organizer", fr: "Organisateur de médicaments", ar: "منظم أدوية" },
        { en: "Emergency alert device", fr: "Dispositif d'alerte d'urgence", ar: "جهاز إنذار للطوارئ" },
        { en: "Comfortable footwear", fr: "Chaussures confortables", ar: "أحذية مريحة" }
    ],
    cooking: [
        { en: "Professional knife set", fr: "Ensemble de couteaux professionnels", ar: "مجموعة سكاكين احترافية" },
        { en: "Specialty spices", fr: "Épices de spécialité", ar: "توابل مميزة" },
        { en: "Apron & headwear", fr: "Tablier et toque", ar: "مريلة وغطاء رأس" },
        { en: "Portable induction cooktop", fr: "Plaque à induction portable", ar: "موقد تحريض محمول" },
        { en: "Kitchen scale", fr: "Balance de cuisine", ar: "ميزان مطبخ" },
        { en: "Pastry tools", fr: "Outils de pâtisserie", ar: "أدوات حلويات" }
    ],
    private_driver: [
        { en: "Smartphone with GPS", fr: "Smartphone avec GPS", ar: "هاتف ذكي بنظام GPS" },
        { en: "First aid kit", fr: "Kit de premiers secours", ar: "حقيبة إسعافات أولية" },
        { en: "Car air freshener", fr: "Désodorisant de voiture", ar: "معطر جو للسيارة" },
        { en: "Phone charger for passengers", fr: "Chargeur de téléphone pour passagers", ar: "شاحن هاتف للمسافرين" },
        { en: "Umbrella", fr: "Parapluie", ar: "مظلة" },
        { en: "Bottled water holder", fr: "Porte-bouteille d'eau", ar: "حامل زجاجات ماء" }
    ],
    learn_arabic: [
        { en: "Lesson handouts / textbooks", fr: "Documents de leçon / manuels", ar: "مذكرات تعليمية / كتب مدرسية" },
        { en: "Whiteboard & markers", fr: "Tableau blanc et marqueurs", ar: "سبورة بيضاء وأقلام" },
        { en: "Audio recordings", fr: "Enregistrements audio", ar: "تسجيلات صوتية" },
        { en: "Tablet / Laptop", fr: "Tablette / Ordinateur portable", ar: "تابلت / لابتوب" },
        { en: "Flashcards", fr: "Cartes mémoires", ar: "بطاقات تعليمية" }
    ],
};

// Services where equipment is not typically applicable
const NO_EQUIPMENT_SERVICES = ['errands', 'driver', 'car_rental', 'courier', 'airport', 'transport_intercity', 'private_driver', 'learn_arabic', 'tour_guide'];

const safeUploadBlob = async (storageRef: any, fileOrBlob: Blob | File, metadata?: any) => {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    // Ensure we pass the content type if available, so Storage Rules can validate it
    const finalMetadata = {
        contentType: (fileOrBlob as any).type || (fileOrBlob as any).mimeType || 'application/octet-stream',
        ...metadata
    };
    return await uploadBytes(storageRef, arrayBuffer, finalMetadata);
};

const normalizeImageList = (value: any): string[] => {
    if (!Array.isArray(value)) return [];
    const cleaned = value.filter((item) => typeof item === 'string' && item.trim().length > 0);
    return Array.from(new Set(cleaned));
};

const OnboardingPopup = (props: OnboardingPopupProps) => {
    const { isOpen, onClose, onComplete, mode = 'onboarding', initialCategory, userData } = props;
    const { showToast } = useToast();
    const { t, language, setLanguage } = useLanguage();
    const isMobile = useIsMobileViewport(968);

    // ── Data ────────────────────────────────────────────────────────────────
    const [selectedSubServices, setSelectedSubServices] = useState<string[]>(
        mode === 'edit' && initialCategory ? initialCategory.subServices || [] : []
    );
    const [categoryEntries, setCategoryEntries] = useState<Record<string, CategoryDetail>>(
        mode === 'edit' && initialCategory ? {
            [initialCategory.categoryId]: {
                categoryId: initialCategory.categoryId,
                categoryName: initialCategory.categoryName || initialCategory.categoryId,
                hourlyRate: initialCategory.hourlyRate || 75,
                pitch: initialCategory.pitch || '',
                experience: initialCategory.experience || '',
                equipments: initialCategory.equipments || [],
                noEquipment: initialCategory.noEquipment || false,
                portfolioImages: normalizeImageList(
                    initialCategory.portfolioImages || initialCategory.portfolio || initialCategory.images || initialCategory.portfolio_images
                ),
                spokenLanguages: initialCategory.spokenLanguages || [],
            }
        } : {}
    );
    const [activeCategoryId, setActiveCategoryId] = useState<string>(
        mode === 'edit' && initialCategory ? initialCategory.categoryId : (ALL_SERVICES[0]?.id || '')
    );
    const [currentCatIdx, setCurrentCatIdx] = useState(0);
    const [equipmentSearch, setEquipmentSearch] = useState('');

    const [selectedCity, setSelectedCity] = useState(String(userData?.city || ''));
    const [areaSearch, setAreaSearch] = useState('');
    const [selectedAreas, setSelectedAreas] = useState<string[]>(Array.isArray(userData?.areas) ? userData.areas : (Array.isArray(userData?.selectedAreas) ? userData.selectedAreas : []));

    // Availability state
    const [availability, setAvailability] = useState<Record<string, { from: string; to: string }[]>>({
        'Mon': [{ from: '09:00', to: '18:00' }],
        'Tue': [{ from: '09:00', to: '18:00' }],
        'Wed': [{ from: '09:00', to: '18:00' }],
        'Thu': [{ from: '09:00', to: '18:00' }],
        'Fri': [{ from: '09:00', to: '18:00' }],
        'Sat': [{ from: '09:00', to: '18:00' }],
        'Sun': [{ from: '09:00', to: '18:00' }],
    });
    const [direction, setDirection] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [fullName, setFullName] = useState(userData?.fullName || '');
    const [whatsappNumber, setWhatsappNumber] = useState(userData?.whatsappNumber || '');
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>(
        userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || auth.currentUser?.photoURL || ''
    );
    const [isProcessingProfilePhoto, setIsProcessingProfilePhoto] = useState(false);
    const [isProcessingPortfolioImages, setIsProcessingPortfolioImages] = useState(false);
    const [idFrontDataUrl, setIdFrontDataUrl] = useState<string | null>(null);
    const [idBackDataUrl, setIdBackDataUrl] = useState<string | null>(null);
    const [isUploadingId, setIsUploadingId] = useState(false);
    const [isUploadingProfile, setIsUploadingProfile] = useState(false);

    // Optional bank details
    const [bankName, setBankName] = useState(userData?.bankName || '');
    const [bricolerBankCardName, setBricolerBankCardName] = useState(userData?.bricolerBankCardName || '');
    const [ribIBAN, setRibIBAN] = useState(userData?.ribIBAN || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
    const [errandsTransport, setErrandsTransport] = useState<string>(userData?.errandsTransport || '');
    const [movingTransports, setMovingTransports] = useState<string[]>(
        Array.isArray(userData?.movingTransports)
            ? userData.movingTransports
            : (userData?.movingTransport ? [userData.movingTransport] : [])
    );
    const [tourGuideAuthorizationFile, setTourGuideAuthorizationFile] = useState<File | Blob | null>(null);
    const [tourGuideAuthorizationUrl, setTourGuideAuthorizationUrl] = useState<string>(userData?.tourGuideAuthorizationUrl || '');

    // Activation code states
    const [hasCode, setHasCode] = useState<boolean | null>(null);
    const [activationCode, setActivationCode] = useState('');
    const [localUserData, setLocalUserData] = useState<any>(userData || null);

    // Car rental state
    const [selectedCars, setSelectedCars] = useState<any[]>(
        mode === 'edit' && userData?.carRentalDetails?.cars ? userData.carRentalDetails.cars : []
    );
    const [activeBrandId, setActiveBrandId] = useState<string>(CAR_BRANDS[0]?.id || '');

    const [baseLat, setBaseLat] = useState<number | null>(userData?.base_lat || null);
    const [baseLng, setBaseLng] = useState<number | null>(userData?.base_lng || null);
    const [baseAddress, setBaseAddress] = useState<string>(userData?.base_address || userData?.address || '');
    const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(userData?.service_radius_km || 10);

    useEffect(() => {
        if (!fullName && auth.currentUser?.displayName) {
            setFullName(auth.currentUser.displayName);
        }
        if (!profilePhotoUrl && auth.currentUser?.photoURL) {
            setProfilePhotoUrl(auth.currentUser.photoURL);
        }
    }, [auth.currentUser, fullName, profilePhotoUrl]);

    const [hasGoogleSigned, setHasGoogleSigned] = useState(false);

    // ── Steps (no Availability — bricoler sets it in their dashboard) ────────
    const STEPS = useMemo(() => {
        const isClientEdit = mode === 'edit' || mode === 'add';
        const isAdminEdit = mode === 'admin_add' || mode === 'admin_edit';

        const steps = [];

        if (mode === 'onboarding') {
            steps.push({ id: 'language', label: t({ en: 'Language', fr: 'Langue', ar: 'اللغة' }) });
            steps.push({ id: 'activation', label: t({ en: 'Activation', fr: 'Activation', ar: 'تفعيل' }) });
        }

        steps.push({ id: 'services', label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) });

        // Inject car steps if rent_a_car is selected
        if (selectedSubServices.includes('rent_a_car')) {
            steps.push({ id: 'car_selection', label: t({ en: 'Cars', fr: 'Voitures', ar: 'السيارات' }) });
            steps.push({ id: 'car_pricing', label: t({ en: 'Pricing', fr: 'Tarifs', ar: 'الأسعار' }) });
        }

        steps.push({ id: 'service_details', label: t({ en: 'Details', fr: 'Détails', ar: 'التفاصيل' }) });
        steps.push({ id: 'base_location', label: t({ en: 'Location', fr: 'Localisation', ar: 'الموقع' }) });

        if (!isClientEdit) {
            steps.push({ id: 'profile', label: t({ en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' }) });
        }

        steps.push({ id: 'finish', label: isClientEdit ? t({ en: 'Review', fr: 'Révision', ar: 'المراجعة' }) : t({ en: 'Sign Up', fr: 'Inscription', ar: 'تسجيل' }) });

        return steps;
    }, [t, mode, selectedSubServices]);

    const [stepIndex, setStepIndex] = useState(mode === 'edit' ? 1 : 0);
    const step = STEPS[stepIndex]?.id || 'services';
    const totalSteps = STEPS.length;

    // ── Sync state with userData (for edit mode) ───────────────────────────
    useEffect(() => {
        if (userData && (mode === 'admin_edit' || mode === 'edit')) {
            setFullName(userData.fullName || '');
            setWhatsappNumber(userData.whatsappNumber || '');
            setBankName(userData.bankName || '');
            setBricolerBankCardName(userData.bricolerBankCardName || '');
            setRibIBAN(userData.ribIBAN || '');
            setSelectedCity(String(userData.city || ''));
            setSelectedAreas(Array.isArray(userData.areas) ? userData.areas : (Array.isArray(userData.selectedAreas) ? userData.selectedAreas : []));
            setProfilePhotoUrl(userData.profilePhotoURL || userData.avatar || userData.photoURL || '');
            setErrandsTransport(userData.errandsTransport || '');
            setMovingTransports(
                Array.isArray(userData.movingTransports)
                    ? userData.movingTransports
                    : (userData.movingTransport ? [userData.movingTransport] : [])
            );

            if (userData.carRentalDetails?.cars) {
                setSelectedCars(userData.carRentalDetails.cars);
            }

            if (userData.services && Array.isArray(userData.services)) {
                const subIds: string[] = [];
                const entries: Record<string, CategoryDetail> = {};

                userData.services.forEach((s: any) => {
                    const thisCatId = s.categoryId || (typeof s === 'string' ? s : null);

                    if (mode === 'edit' && initialCategory && thisCatId && thisCatId !== initialCategory.categoryId) {
                        return; // ONLY load the specific category we are editing
                    }

                    let subId = typeof s === 'string' ? s : (s.subServiceId || s.id);
                    if (!subId && thisCatId === 'car_rental') subId = 'rent_a_car';
                    else if (!subId && thisCatId) {
                        const cat = ALL_SERVICES.find(c => c.id === thisCatId);
                        if (cat?.subServices && cat.subServices.length > 0) subId = cat.subServices[0].id;
                        else subId = thisCatId;
                    }

                    if (subId) subIds.push(subId);

                    const svc = ALL_SERVICES.find(cat => cat.subServices.some(ss => ss.id === subId) || cat.id === subId);
                    if (svc) {
                        const catId = svc.id;
                        const serviceImages = typeof s === 'object'
                            ? normalizeImageList(s.portfolioImages || s.portfolio || s.images || s.portfolio_images)
                            : [];
                        if (!entries[catId]) {
                            entries[catId] = {
                                categoryId: catId,
                                categoryName: svc.name,
                                hourlyRate: typeof s === 'object' ? (s.hourlyRate || 75) : 75,
                                pitch: typeof s === 'object' ? (s.pitch || "") : "",
                                experience: typeof s === 'object' ? (s.experience || "") : "",
                                equipments: typeof s === 'object' ? (s.equipments || []) : [],
                                noEquipment: typeof s === 'object' ? (s.noEquipment || false) : false,
                                portfolioImages: serviceImages,
                                spokenLanguages: typeof s === 'object' ? (s.spokenLanguages || []) : [],
                            };
                        } else if (serviceImages.length > 0) {
                            entries[catId].portfolioImages = Array.from(new Set([...entries[catId].portfolioImages, ...serviceImages]));
                        }
                    }
                });

                setSelectedSubServices(subIds);
                setCategoryEntries(entries);
                if (subIds.length > 0) {
                    const firstSvc = ALL_SERVICES.find(cat => cat.subServices.some(ss => ss.id === subIds[0]) || cat.id === subIds[0]);
                    if (firstSvc) setActiveCategoryId(firstSvc.id);
                }
            }
        }
    }, [userData, mode]);

    // ── Current category being configured ────────────────────────────────────
    const selectedCategoryIds = useMemo(() => {
        const cats = new Set<string>();
        selectedSubServices.forEach(subId => {
            const svc = ALL_SERVICES.find(s => s.subServices.some(ss => ss.id === subId) || s.id === subId);
            if (svc) cats.add(svc.id);
        });
        return Array.from(cats);
    }, [selectedSubServices]);

    const currentCatId = selectedCategoryIds[currentCatIdx];
    const currentCatEntry: CategoryDetail | undefined = currentCatId ? categoryEntries[currentCatId] : undefined;
    const tierInfo = currentCatEntry ? SERVICE_TIER_RATES[currentCatEntry.categoryId] : undefined;

    const filteredAreas = useMemo(() => {
        const all = selectedCity ? MOROCCAN_CITIES_AREAS[selectedCity] || [] : [];
        if (!areaSearch.trim()) return all;
        return all.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
    }, [selectedCity, areaSearch]);

    // ── Validation ───────────────────────────────────────────────────────────
    const currentEntryValid = (entry: CategoryDetail | undefined): boolean => {
        if (!entry) return false;
        const baseValid = (
            entry.experience !== '' &&
            (entry.noEquipment || entry.equipments.length > 0) &&
            entry.hourlyRate > 0 &&
            entry.pitch.trim().length >= MIN_PITCH_CHARS
        );
        if (entry.categoryId === 'tour_guide') {
            return baseValid && (entry.spokenLanguages?.length || 0) > 0;
        }
        return baseValid;
    };

    const migrateShadowJobs = async (targetUid: string, metaId: string) => {
        try {
            console.log(`Starting job migration from ${metaId} to ${targetUid}...`);
            const jobsQuery = query(collection(db, 'jobs'), where('bricolerId', '==', metaId));
            const jobsSnap = await getDocs(jobsQuery);

            if (!jobsSnap.empty) {
                // Chunk into batches of 500 (Firestore limit)
                const docs = jobsSnap.docs;
                for (let i = 0; i < docs.length; i += 500) {
                    const chunk = docs.slice(i, i + 500);
                    const batch = writeBatch(db);
                    chunk.forEach(docSnap => {
                        batch.update(docSnap.ref, {
                            bricolerId: targetUid,
                            updatedAt: serverTimestamp()
                        });
                    });
                    await batch.commit();
                }
                console.log(`Successfully migrated ${jobsSnap.size} jobs.`);
            }
        } catch (err) {
            console.error("Migration failed:", err);
        }
    };

    const handleVerifyCode = async () => {
        if (!activationCode.trim()) return;
        setIsSubmitting(true);
        try {
            const q = query(collection(db, 'bricolers'), where('claimCode', '==', activationCode.trim().toUpperCase()), limit(1));
            const s = await getDocs(q);
            if (!s.empty) {
                const data = s.docs[0].data();
                const metaId = s.docs[0].id;
                setLocalUserData({ ...data, id: metaId, metaId: metaId });

                if (data.city) setSelectedCity(String(data.city));
                if (Array.isArray(data.workAreas)) setSelectedAreas(data.workAreas);
                if (data.profilePhotoURL || data.avatar || data.photoURL) {
                    setProfilePhotoUrl(data.profilePhotoURL || data.avatar || data.photoURL);
                }
                if (data.services && Array.isArray(data.services)) {
                    const entries: Record<string, CategoryDetail> = {};
                    const subIds: string[] = [];
                    data.services.forEach((service: any) => {
                        const catId = service.categoryId;
                        const serviceImages = normalizeImageList(service.portfolioImages || service.portfolio || service.images || service.portfolio_images);
                        if (!entries[catId]) {
                            entries[catId] = {
                                categoryId: catId,
                                categoryName: service.categoryName,
                                hourlyRate: service.hourlyRate || 75,
                                pitch: service.pitch || "",
                                experience: service.experience || "",
                                equipments: service.equipments || [],
                                noEquipment: service.noEquipment || false,
                                portfolioImages: serviceImages,
                            };
                        } else if (serviceImages.length > 0) {
                            entries[catId].portfolioImages = Array.from(new Set([...entries[catId].portfolioImages, ...serviceImages]));
                        }
                        subIds.push(service.subServiceId);
                    });
                    setCategoryEntries(entries);
                    setSelectedSubServices(subIds);
                }
                if (data.name) setFullName(data.name);
                if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);

                showToast({
                    variant: 'success',
                    title: t({ en: 'Code Verified!', fr: 'Code Vérifié !' }),
                    description: t({ en: 'Profile found. Let\'s continue.', fr: 'Profil trouvé. Continuons.' })
                });
                setStepIndex(s => s + 1);
            } else {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Invalid code', fr: 'Code invalide' }),
                    description: t({ en: 'Activation code not found.', fr: 'Code d\'activation non trouvé.' })
                });
            }
        } catch (err) {
            console.error("Verification error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBricolerSignup = async () => {
        setIsSubmitting(true);
        setSubmittingStatus("Preparing...");
        let submitWatchdog: ReturnType<typeof setTimeout> | null = null;
        let watchdogTriggered = false;

        submitWatchdog = setTimeout(() => {
            watchdogTriggered = true;
            setIsSubmitting(false);
            setSubmittingStatus(null);
            showToast({
                variant: 'error',
                title: t({ en: 'Taking too long', fr: 'Cela prend trop de temps', ar: 'يستغرق وقتاً طويلاً' }),
                description: t({
                    en: 'We stopped waiting. Please check your connection and retry.',
                    fr: 'Nous avons arrêté l’attente. Vérifiez votre connexion puis réessayez.',
                    ar: 'توقفنا عن الانتظار. يرجى التحقق من الاتصال ثم إعادة المحاولة.'
                })
            });
        }, 90000);

        try {
            let user = auth.currentUser;
            if (!user) {
                console.log("No user found, starting Google Sign-in...");
                setSubmittingStatus("Authenticating...");
                const provider = new GoogleAuthProvider();
                try {
                    const result = await signInWithPopup(auth, provider);
                    user = result.user;
                } catch (popupError: any) {
                    console.warn("Popup sign-in failed/blocked, trying redirect...", popupError);
                    if (popupError.code === 'auth/popup-blocked' || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                        await signInWithRedirect(auth, provider);
                        return; // Stop here, redirect will happen
                    }
                    throw popupError;
                }

                // Wait for the Firebase auth token to propagate to Firestore.
                setSubmittingStatus(t({
                    en: "Setting up your account...",
                    fr: "Configuration de votre compte...",
                    ar: "جاري إعداد حسابك..."
                }));
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            if (!user) throw new Error("AUTH_FAILED");
            setSubmittingStatus(t({
                en: "Preparing profile...",
                fr: "Préparation du profil...",
                ar: "جاري تجهيز الملف الشخصي..."
            }));

            const ALL_SVCS = getAllServices();
            const initialEntries = selectedSubServices.map(subId => {
                const svc = ALL_SVCS.find(s => s.subServices?.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: svc?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 75,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: normalizeImageList(e?.portfolioImages || []),
                    spokenLanguages: e?.spokenLanguages || [],
                };
            });
            const hasPendingTourGuideUpload = !!(tourGuideAuthorizationFile && selectedSubServices.some(id => id.includes('tour_guide')));

            // 3. Firestore Saves
            setSubmittingStatus(t({
                en: "Saving profile...",
                fr: "Enregistrement du profil...",
                ar: "جاري حفظ الملف الشخصي..."
            }));

            const bricolerRef = doc(db, 'bricolers', user.uid);
            const isClaimingShadow = localUserData && localUserData.id && !localUserData.uid;

            // Retry Firestore reads up to 3 times with 2s backoff.
            let bSnap: any = null;
            let cSnap: any = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const result = await Promise.race([
                        Promise.all([getDoc(bricolerRef), getDoc(doc(db, 'clients', user.uid))]),
                        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 15000))
                    ]);
                    [bSnap, cSnap] = result;
                    break; // success — exit retry loop
                } catch (readErr: any) {
                    const isPermDenied = readErr?.code === 'permission-denied' || readErr?.message?.includes('permission');
                    console.warn(`Firestore read attempt ${attempt} failed:`, readErr?.code || readErr?.message);
                    if (attempt < 3 && isPermDenied) {
                        setSubmittingStatus(t({
                            en: `Finalizing account setup... (${attempt}/3)`,
                            fr: `Finalisation de la configuration... (${attempt}/3)`,
                            ar: `إنهاء إعداد الحساب... (${attempt}/3)`
                        }));
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        throw readErr;
                    }
                }
            }
            const existingBricoler = bSnap.exists() ? bSnap.data() : null;
            const googlePhotoURL = user.photoURL || existingBricoler?.googlePhotoURL || '';
            const finalTourGuideUrl =
                tourGuideAuthorizationUrl ||
                existingBricoler?.tourGuideAuthorizationUrl ||
                localUserData?.tourGuideAuthorizationUrl ||
                null;
            const hasPendingProfileUpload = isImageDataUrl(profilePhotoUrl);
            const hasPendingServiceUploads = initialEntries.some((entry) => entryHasPendingImageUploads(entry));
            const immediateProfilePhotoUrl = !hasPendingProfileUpload ? profilePhotoUrl : '';
            const finalProfilePhotoUrl = immediateProfilePhotoUrl || existingBricoler?.profilePhotoURL || existingBricoler?.avatar || existingBricoler?.photoURL || googlePhotoURL || '';
            const finalCategoryEntries = stripPendingImagesFromEntries(initialEntries);

            // Helper to merge services when editing
            const mergeServicesList = (existing: any[], edited: any[]) => {
                if (!existing || existing.length === 0) return edited;
                const editedMap = new Map();
                edited.forEach(s => {
                    const id = s.subServiceId || s.serviceId || s.categoryId || (typeof s === 'string' ? s : null);
                    if (id) editedMap.set(String(id).toLowerCase(), s);
                });

                const merged = existing.map(s => {
                    const id = s.subServiceId || s.serviceId || s.categoryId || (typeof s === 'string' ? s : null);
                    const normalizedId = id ? String(id).toLowerCase() : null;
                    if (normalizedId && editedMap.has(normalizedId)) return editedMap.get(normalizedId);
                    return s;
                });

                const existingIds = new Set(existing.map(s => {
                    const id = s.subServiceId || s.serviceId || s.categoryId || (typeof s === 'string' ? s : null);
                    return id ? String(id).toLowerCase() : null;
                }).filter(Boolean));

                edited.forEach(s => {
                    const id = s.subServiceId || s.serviceId || s.categoryId || (typeof s === 'string' ? s : null);
                    const normalizedId = id ? String(id).toLowerCase() : null;
                    if (normalizedId && !existingIds.has(normalizedId)) merged.push(s);
                });
                return merged;
            };

            const mergedServices = (mode === 'edit' || mode === 'add' || mode === 'admin_edit') && existingBricoler?.services
                ? mergeServicesList(existingBricoler.services, finalCategoryEntries)
                : finalCategoryEntries;

            const allPortfolioUrls = Array.from(new Set(mergedServices.flatMap((entry: any) => normalizeImageList(entry.portfolioImages || entry.portfolio || entry.images))));

            const cleanObj = (obj: any) => {
                const newObj: any = {};
                Object.keys(obj).forEach(k => { if (obj[k] !== undefined) newObj[k] = obj[k]; });
                return newObj;
            };

            // Translate bio before building bricolerData so it can be included atomically
            setSubmittingStatus("Translating bio...");
            const bioText = mergedServices.find((s: any) => s.pitch)?.pitch || (mergedServices[0] as any)?.pitch || "";
            const bioTranslations = bioText ? await translateBio(bioText) : {};

            const bricolerData = cleanObj({
                uid: user.uid,
                name: (fullName || user.displayName || "Bricoler").trim(),
                displayName: (fullName || user.displayName || "Bricoler").trim(),
                email: user.email || "",
                photoURL: existingBricoler?.photoURL || googlePhotoURL || finalProfilePhotoUrl || "",
                avatar: finalProfilePhotoUrl || existingBricoler?.avatar || googlePhotoURL || "",
                profilePhotoURL: finalProfilePhotoUrl || "",
                googlePhotoURL: googlePhotoURL || "",
                whatsappNumber: (whatsappNumber || '').trim(),
                phone: (whatsappNumber || '').trim(),
                bankName: (bankName || '').trim(),
                bricolerBankCardName: (bricolerBankCardName || '').trim(),
                ribIBAN: (ribIBAN || '').trim(),
                services: mergedServices,
                serviceIds: [...new Set(mergedServices.map((s: any) =>
                    (typeof s === 'string' ? s : (s.categoryId || s.serviceId || s.id || '')).toLowerCase()
                ).filter(Boolean))],
                subServiceIds: [...new Set(mergedServices.map((s: any) => {
                    const ssId = s.subServiceId || '';
                    const ssList = Array.isArray(s.subServices) ? s.subServices : [];
                    return [ssId, ...ssList];
                }).flat().map(id => String(id).toLowerCase()).filter(Boolean))],
                portfolio: allPortfolioUrls,
                images: allPortfolioUrls,
                bio: mergedServices.find((s: any) => s.pitch)?.pitch || (mergedServices[0] as any)?.pitch || "",
                bio_translations: bioTranslations || {},
                experience: mergedServices.find((s: any) => s.experience)?.experience || (mergedServices[0] as any)?.experience || "",
                city: selectedCity || "",
                workAreas: selectedAreas || [],
                base_lat: baseLat,
                base_lng: baseLng,
                base_address: baseAddress,
                service_radius_km: serviceRadiusKm,
                updatedAt: serverTimestamp(),
                createdAt: existingBricoler?.createdAt || (isClaimingShadow ? localUserData.createdAt : null) || serverTimestamp(),
                isActive: true,
                isVerified: existingBricoler?.isVerified || (isClaimingShadow ? localUserData.isVerified : false) || false,
                rating: existingBricoler?.rating || (isClaimingShadow ? localUserData.rating : 0) || 0,
                completedJobs: existingBricoler?.completedJobs || (isClaimingShadow ? localUserData.completedJobs : 0) || 0,
                numReviews: existingBricoler?.numReviews || (isClaimingShadow ? localUserData.numReviews : 0) || 0,
                isBricoler: true,
                lastLoginAt: serverTimestamp(),
                carRentalDetails: selectedSubServices.includes('rent_a_car') ? {
                    cars: selectedCars,
                } : null,
                errandsTransport,
                movingTransports,
                movingTransport: movingTransports[0] || '', // legacy compatibility
                tourGuideAuthorizationUrl: finalTourGuideUrl || null,
                verification: (idFrontDataUrl || idBackDataUrl) ? {
                    status: 'pending_review',
                    submittedAt: serverTimestamp()
                } : (existingBricoler?.verification || null)
            });

            if (isClaimingShadow) {
                setSubmittingStatus("Migrating data...");
                await migrateShadowJobs(user.uid, localUserData.id);
                try { await deleteDoc(doc(db, 'bricolers', localUserData.id)); } catch (e) { }
            }

            setSubmittingStatus("Finalizing...");
            await Promise.race([
                Promise.all([
                    setDoc(bricolerRef, bricolerData, { merge: true }),
                    setDoc(doc(db, 'clients', user.uid), {
                        uid: user.uid,
                        name: bricolerData.name,
                        email: bricolerData.email,
                        photoURL: bricolerData.profilePhotoURL || bricolerData.avatar || bricolerData.photoURL || "",
                        whatsappNumber: bricolerData.whatsappNumber,
                        isBricoler: true,
                        userType: 'bricoler',
                        createdAt: cSnap.exists() ? cSnap.data().createdAt : serverTimestamp(),
                    }, { merge: true })
                ]),
                new Promise<any>((_, reject) => setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), 25000))
            ]);

            if (selectedCity) {
                await Promise.race([
                    (async () => {
                        const cityRef = doc(db, 'city_services', selectedCity);
                        const citySnap = await getDoc(cityRef);
                        const svcIds = [...new Set(finalCategoryEntries.map(e => e.categoryId))];
                        const subSvcIds = selectedSubServices || [];

                        if (!citySnap.exists()) {
                            await setDoc(cityRef, {
                                active_services: svcIds,
                                active_sub_services: subSvcIds,
                                work_areas: selectedAreas,
                                total_pros: 1,
                                lastUpdated: serverTimestamp()
                            });
                        } else {
                            const data = citySnap.data();
                            const updated = [...new Set([...(data.active_services || []), ...svcIds])];
                            const updatedSubs = [...new Set([...(data.active_sub_services || []), ...subSvcIds])];
                            await updateDoc(cityRef, {
                                active_services: updated,
                                active_sub_services: updatedSubs,
                                total_pros: (data.total_pros || 0) + 1,
                                lastUpdated: serverTimestamp()
                            });
                        }
                    })(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("CITY_UPDATE_TIMEOUT")), 12000))
                ]).catch((error) => {
                    console.warn("City service index update skipped:", error);
                });
            }

            // Write initial city_index entry so this Bricoler appears in search immediately (non-blocking)
            if (selectedCity && user) {
                writeCityIndex(user.uid, selectedCity, {
                    displayName: bricolerData.name || bricolerData.displayName,
                    profilePhotoURL: bricolerData.profilePhotoURL || bricolerData.avatar,
                    rating: bricolerData.rating || 5.0,
                    completedJobs: bricolerData.completedJobs || 0,
                    numReviews: bricolerData.numReviews || 0,
                    jobsDone: bricolerData.completedJobs || 0,
                    bio: finalCategoryEntries[0]?.pitch || "",
                    isVerified: bricolerData.isVerified || false,
                    isActive: true,
                    services: bricolerData.services || [],
                    areas: selectedAreas || [],
                    whatsappNumber: bricolerData.whatsappNumber,
                    routine: bricolerData.routine,
                    errandsTransport,
                    movingTransports,
                    movingTransport: movingTransports[0] || '',
                }).catch(console.warn);
            }

            // ── Upload images synchronously with clear status messages ─────────────────
            // Background uploads kept failing (IMAGE_UPLOAD_TIMEOUT) because base64 data
            // was being garbage-collected or the promise died after component unmount.
            // We now upload BEFORE calling onComplete so images are guaranteed to save.

            let uploadedProfilePhotoUrl = finalProfilePhotoUrl;
            let finalizedServices = mergedServices;
            let finalPortfolioFull = allPortfolioUrls;

            if (hasPendingProfileUpload || hasPendingServiceUploads || hasPendingTourGuideUpload || idFrontDataUrl || idBackDataUrl) {
                setSubmittingStatus("Uploading media...");
                try {
                    const uploadProfileTask = resolveProfilePhoto(user.uid, profilePhotoUrl);
                    const uploadEntriesTask = attachUploadedImagesToEntries(user.uid, initialEntries);
                    const uploadIdFrontTask = idFrontDataUrl ? uploadVerificationId(user.uid, 'front', idFrontDataUrl) : Promise.resolve(null);
                    const uploadIdBackTask = idBackDataUrl ? uploadVerificationId(user.uid, 'back', idBackDataUrl) : Promise.resolve(null);

                    let uploadTourGuideTask = Promise.resolve(finalTourGuideUrl);
                    if (hasPendingTourGuideUpload && tourGuideAuthorizationFile) {
                        uploadTourGuideTask = (async () => {
                            const res = await safeUploadBlob(ref(storage, `verifications/${user!.uid}/${Date.now()}_tour_guide`), tourGuideAuthorizationFile);
                            return await getDownloadURL(res.ref);
                        })();
                    }

                    const [newProfileUrl, newEntries, newTourGuideUrl, frontUrl, backUrl] = await Promise.all([
                        uploadProfileTask,
                        uploadEntriesTask,
                        uploadTourGuideTask,
                        uploadIdFrontTask,
                        uploadIdBackTask
                    ]);

                    uploadedProfilePhotoUrl = newProfileUrl || finalProfilePhotoUrl;

                    // Re-merge with uploaded entries
                    finalizedServices = (mode === 'edit' || mode === 'add' || mode === 'admin_edit') && existingBricoler?.services
                        ? mergeServicesList(existingBricoler.services, newEntries)
                        : newEntries;

                    const updatedTourGuideUrl = newTourGuideUrl || finalTourGuideUrl;

                    // Update Firestore with final URLs
                    setSubmittingStatus("Finalizing...");
                    finalPortfolioFull = Array.from(new Set(finalizedServices.flatMap((e: any) => normalizeImageList(e.portfolioImages || e.portfolio || e.images))));

                    const updateData: any = {
                        avatar: uploadedProfilePhotoUrl,
                        profilePhotoURL: uploadedProfilePhotoUrl,
                        photoURL: uploadedProfilePhotoUrl || bricolerData.photoURL,
                        services: finalizedServices,
                        portfolio: finalPortfolioFull,
                        images: finalPortfolioFull,
                        tourGuideAuthorizationUrl: updatedTourGuideUrl
                    };

                    if (frontUrl || backUrl) {
                        updateData.verification = {
                            frontUrl: frontUrl || (existingBricoler?.verification?.frontUrl || null),
                            backUrl: backUrl || (existingBricoler?.verification?.backUrl || null),
                            status: 'pending_review',
                            submittedAt: serverTimestamp()
                        };
                    }

                    await updateDoc(bricolerRef, updateData);

                    // Update client doc too
                    await updateDoc(doc(db, 'clients', user.uid), {
                        photoURL: uploadedProfilePhotoUrl || bricolerData.photoURL
                    });

                    // Update city_index again with final data (including new image URLs)
                    if (selectedCity && user) {
                        await writeCityIndex(user.uid, selectedCity, {
                            ...bricolerData,
                            avatar: uploadedProfilePhotoUrl,
                            profilePhotoURL: uploadedProfilePhotoUrl,
                            services: finalizedServices,
                            portfolio: finalPortfolioFull,
                            images: finalPortfolioFull,
                        }).catch(console.warn);
                    }

                } catch (mediaError) {
                    console.error("Media upload failed:", mediaError);
                    // We don't block the whole process, but we inform the user
                    showToast({
                        variant: 'info',
                        title: t({ en: 'Media upload issue', fr: 'Problème de téléversement' }),
                        description: t({ en: 'Some photos might not have saved correctly.', fr: 'Certaines photos peuvent ne pas avoir été enregistrées.' })
                    });
                }
            }

            setSubmittingStatus("Complete!");
            onComplete({ services: finalizedServices, city: selectedCity, availability });

        } catch (error: any) {
            console.error('Signup error:', error);
            let msg = error.message || "An error occurred";
            const isPopupClosed = error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user');

            if (isPopupClosed) {
                // User deliberately closed the popup — reset silently, no toast needed
                setSubmittingStatus(null);
            } else {
                // Show the actual error to help the bricoler understand what went wrong
                const friendlyMsg = error.code === 'permission-denied'
                    ? t({ en: 'Permission error. Please try again in a few seconds.', fr: 'Erreur de permission. Veuillez réessayer dans quelques secondes.', ar: 'خطأ في الصلاحيات. يرجى المحاولة مجدداً بعد لحظات.' })
                    : String(error?.message || '').includes('PORTFOLIO_UPLOAD_FAILED')
                        ? t({ en: 'Portfolio photo upload failed. Please check connection and retry.', fr: 'Échec du téléversement des photos de réalisations. Vérifiez la connexion et réessayez.', ar: 'فشل رفع صور الأعمال. تحقق من الاتصال وأعد المحاولة.' })
                        : String(error?.message || '').includes('PROFILE_UPLOAD_FAILED')
                            ? t({ en: 'Profile photo upload failed. Please retry.', fr: 'Échec du téléversement de la photo de profil. Veuillez réessayer.', ar: 'فشل رفع صورة الملف الشخصي. يرجى المحاولة مجدداً.' })
                            : String(error?.message || '').includes('SERVICE_IMAGES_UPLOAD_FAILED')
                                ? t({ en: 'Service image upload failed. Firebase Storage may be rejecting the upload.', fr: 'Le téléversement des images du service a échoué. Firebase Storage peut rejeter le fichier.', ar: 'فشل رفع صور الخدمة. قد تكون Firebase Storage ترفض الملف.' })
                                : String(error?.message || '').includes('IMAGE_UPLOAD_TIMEOUT') || String(error?.message || '').includes('IMAGE_UPLOAD_FAILED')
                                    ? t({ en: 'Image upload timed out. Please retry with a stable connection.', fr: 'Le téléversement des images a expiré. Réessayez avec une connexion stable.', ar: 'انتهت مهلة رفع الصور. أعد المحاولة avec une connexion stable.' })
                                    : String(error?.message || '').includes('DOWNLOAD_URL_TIMEOUT') || String(error?.message || '').includes('BLOB_CONVERSION_TIMEOUT')
                                        ? t({ en: 'Image processing took too long. Please retry.', fr: 'Le traitement des images a pris trop de temps. Veuillez réessayer.', ar: 'استغرقت معالجة الصور وقتاً طويلاً. يرجى المحاولة مجدداً.' })
                                        : error.code === 'FIRESTORE_TIMEOUT' || error.message === 'FIRESTORE_TIMEOUT'
                                            ? t({ en: 'Connection timed out. Please check your internet and try again.', fr: 'Délai de connexion dépassé. Vérifiez votre réseau et réessayez.', ar: 'انتهت مهلة الاتصال. يرجى التحقق من الإنترنت والمحاولة مجدداً.' })
                                            : msg;
                showToast({
                    variant: 'error',
                    title: t({ en: 'Sign-up failed', fr: "Échec de l'inscription", ar: 'فشل التسجيل' }),
                    description: friendlyMsg
                });
            }
            setSubmittingStatus(null);
        } finally {
            if (submitWatchdog) {
                clearTimeout(submitWatchdog);
            }
            if (!watchdogTriggered) {
                setIsSubmitting(false);
            }
        }
    };

    const handleAdminSubmit = async () => {
        setIsSubmitting(true);
        setSubmittingStatus("Saving...");
        try {
            const isEdit = mode === 'admin_edit';
            const metaId = isEdit && userData?.id ? userData.id : 'meta_' + Math.random().toString(36).substr(2, 9).toUpperCase();
            const claimCode = isEdit && userData?.claimCode ? userData.claimCode : 'CLAIM-' + Math.random().toString(36).substr(2, 6).toUpperCase();

            const ALL_SVCS = getAllServices();
            const entries = selectedSubServices.map(subId => {
                const svc = ALL_SVCS.find(s => s.subServices?.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: svc?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 75,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: normalizeImageList(e?.portfolioImages || []),
                    spokenLanguages: e?.spokenLanguages || [],
                };
            });

            setSubmittingStatus("Uploading media...");

            let finalTourGuideAuthUrl = tourGuideAuthorizationUrl || null;
            const finalProfilePhotoUrl = userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || '';
            const googlePhotoURL = userData?.googlePhotoURL || userData?.photoURL || '';
            const finalCategoryEntries = stripPendingImagesFromEntries(entries);
            const allAdminPortfolioUrls = Array.from(new Set(finalCategoryEntries.flatMap((entry) => normalizeImageList(entry.portfolioImages))));

            const cleanObj = (obj: any) => {
                const newObj: any = {};
                Object.keys(obj).forEach(k => { if (obj[k] !== undefined) newObj[k] = obj[k]; });
                return newObj;
            };

            const bricolerData = cleanObj({
                uid: userData?.uid || null,
                name: (fullName || "Bricoler").trim(),
                displayName: (fullName || "Bricoler").trim(),
                avatar: finalProfilePhotoUrl,
                photoURL: userData?.photoURL || googlePhotoURL || finalProfilePhotoUrl,
                profilePhotoURL: finalProfilePhotoUrl,
                googlePhotoURL,
                whatsappNumber: (whatsappNumber || '').trim(),
                phone: (whatsappNumber || '').trim(),
                bankName: (bankName || '').trim(),
                bricolerBankCardName: (bricolerBankCardName || '').trim(),
                ribIBAN: (ribIBAN || '').trim(),
                services: finalCategoryEntries,
                portfolio: allAdminPortfolioUrls,
                images: allAdminPortfolioUrls,
                city: selectedCity,
                workAreas: selectedAreas,
                isActive: true,
                isBricoler: true,
                metaId,
                claimCode,
                updatedAt: serverTimestamp(),
                createdAt: userData?.createdAt || serverTimestamp(),
                numReviews: userData?.numReviews || 0,
                rating: userData?.rating || 5.0,
                completedJobs: userData?.completedJobs || 0,
                carRentalDetails: selectedSubServices.includes('rent_a_car') ? {
                    cars: selectedCars,
                } : null,
                tourGuideAuthorizationUrl: finalTourGuideAuthUrl || null
            });

            await setDoc(doc(db, 'bricolers', metaId), bricolerData, { merge: true });

            // Finalize uploads in background
            setTimeout(async () => {
                const uploads: Promise<any>[] = [];
                if (tourGuideAuthorizationFile) {
                    const arrayBuffer = await tourGuideAuthorizationFile.arrayBuffer();
                    const res = await uploadBytes(ref(storage, `verifications/${metaId}/${Date.now()}_tour_guide_auth`), arrayBuffer);
                    finalTourGuideAuthUrl = await getDownloadURL(res.ref);
                    await setDoc(doc(db, 'bricolers', metaId), { tourGuideAuthorizationUrl: finalTourGuideAuthUrl }, { merge: true });
                }

                const uploadedProfilePhotoUrlTask = resolveProfilePhoto(metaId, profilePhotoUrl);
                const finalizedEntriesTask = attachUploadedImagesToEntries(metaId, entries);

                const [uploadedProfilePhotoUrl, finalizedEntries] = await Promise.all([uploadedProfilePhotoUrlTask, finalizedEntriesTask]);

                const finalAvatarUrl = uploadedProfilePhotoUrl || userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || '';
                const finalAdminPortfolioUrls = Array.from(new Set(finalizedEntries.flatMap((entry) => normalizeImageList(entry.portfolioImages))));

                await setDoc(doc(db, 'bricolers', metaId), {
                    avatar: finalAvatarUrl,
                    profilePhotoURL: finalAvatarUrl,
                    photoURL: uploadedProfilePhotoUrl ? finalAvatarUrl : bricolerData.photoURL,
                    services: finalizedEntries,
                    portfolio: finalAdminPortfolioUrls,
                    images: finalAdminPortfolioUrls,
                }, { merge: true });
            }, 500);

            showToast({ title: isEdit ? 'Profile updated!' : 'Profile created!', variant: 'success' });
            onComplete({ id: metaId, ...bricolerData });
            onClose();
        } catch (error: any) {
            console.error("Admin save error:", error);
            showToast({ title: error.message || "Save failed", variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!auth.currentUser) return;
        setIsSubmitting(true);
        setSubmittingStatus("Saving changes...");

        try {
            const user = auth.currentUser;
            await setDoc(doc(db, 'bricolers', user.uid), { isBricoler: true }, { merge: true });

            const ALL_SVCS = getAllServices();
            const currentEntries = selectedSubServices.map(subId => {
                const svc = ALL_SVCS.find(s => s.subServices?.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: svc?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 75,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: normalizeImageList(e?.portfolioImages || []),
                    spokenLanguages: e?.spokenLanguages || [],
                };
            });

            setSubmittingStatus("Saving...");

            let finalTourGuideAuthUrl = tourGuideAuthorizationUrl || null;

            const bricolerRef = doc(db, 'bricolers', user.uid);
            const bSnap = await getDoc(bricolerRef);
            const existingData = bSnap.exists() ? bSnap.data() : {};

            // Strip pending base64 images immediately — background setTimeout will upload them
            const strippedCurrentEntries = stripPendingImagesFromEntries(currentEntries);
            let updatedServices = strippedCurrentEntries;
            if (bSnap.exists()) {
                const existing = existingData.services || [];
                const currentCategoryIds = Array.from(new Set(strippedCurrentEntries.map((e: any) => e.categoryId)));
                const others = existing.filter((s: any) => !currentCategoryIds.includes(s.categoryId));
                updatedServices = [...others, ...strippedCurrentEntries];
            }

            const finalCategoryEntries = updatedServices;
            const allPortfolioUrls = Array.from(new Set(
                finalCategoryEntries.flatMap((entry: any) => normalizeImageList(entry.portfolioImages || entry.portfolio || entry.images || []))
            ));
            const googlePhotoURL = user.photoURL || existingData.googlePhotoURL || '';
            const finalProfilePhotoUrl = existingData.profilePhotoURL || existingData.avatar || existingData.photoURL || googlePhotoURL || '';

            const updateData = {
                services: finalCategoryEntries,
                portfolio: allPortfolioUrls,
                images: allPortfolioUrls,
                updatedAt: serverTimestamp(),
                isActive: true,
                photoURL: existingData.photoURL || googlePhotoURL || finalProfilePhotoUrl,
                avatar: finalProfilePhotoUrl,
                profilePhotoURL: finalProfilePhotoUrl,
                googlePhotoURL,
                carRentalDetails: selectedSubServices.includes('rent_a_car') ? {
                    cars: selectedCars,
                } : null,
                errandsTransport,
                movingTransports,
                movingTransport: movingTransports[0] || '',
                tourGuideAuthorizationUrl: finalTourGuideAuthUrl || existingData.tourGuideAuthorizationUrl,
                city: selectedCity,
            };
            await setDoc(bricolerRef, updateData, { merge: true });
            await setDoc(doc(db, 'clients', user.uid), {
                isBricoler: true,
                userType: 'bricoler',
                photoURL: finalProfilePhotoUrl || updateData.photoURL || ""
            }, { merge: true });

            // Keep city_index in sync (non-blocking)
            if (selectedCity) {
                writeCityIndex(user.uid, selectedCity, {
                    displayName: existingData.name || existingData.displayName,
                    profilePhotoURL: finalProfilePhotoUrl,
                    rating: existingData.rating || 0,
                    completedJobs: existingData.completedJobs || 0,
                    numReviews: existingData.numReviews || 0,
                    jobsDone: existingData.jobsDone || existingData.completedJobs || 0,
                    bio: existingData.bio,
                    isVerified: existingData.isVerified || false,
                    isActive: true,
                    services: finalCategoryEntries,
                    areas: existingData.workAreas || existingData.areas || [],
                    whatsappNumber: existingData.whatsappNumber,
                    routine: existingData.routine,
                    errandsTransport,
                    movingTransports,
                    movingTransport: movingTransports[0] || '',
                }).catch(console.warn);
            }

            // --- FIXED: Portfolio Image Uploads for Service Editing ---
            // Previously disabled, causing data-url (base64) images to be stripped without being uploaded.
            const hasPendingProfileUpload = isImageDataUrl(profilePhotoUrl);
            const hasPendingServiceUploads = currentEntries.some((entry) => entryHasPendingImageUploads(entry));
            const hasPendingTourGuideUpload = !!(tourGuideAuthorizationFile && selectedSubServices.some(id => id.includes('tour_guide')));

            let finalAvatarUrl = finalProfilePhotoUrl;
            let finalPortfolioFull = allPortfolioUrls;
            let finalizedServices = finalCategoryEntries;

            if (hasPendingProfileUpload || hasPendingServiceUploads || hasPendingTourGuideUpload) {
                setSubmittingStatus("Uploading media...");
                try {
                    const uploadProfileTask = resolveProfilePhoto(user.uid, profilePhotoUrl);
                    const uploadEntriesTask = attachUploadedImagesToEntries(user.uid, currentEntries);

                    let uploadTourGuideTask = Promise.resolve(finalTourGuideAuthUrl);
                    if (hasPendingTourGuideUpload && tourGuideAuthorizationFile) {
                        uploadTourGuideTask = (async () => {
                            const arrayBuffer = await tourGuideAuthorizationFile.arrayBuffer();
                            const res = await uploadBytes(ref(storage, `verifications/${user.uid}/${Date.now()}_tour_guide`), arrayBuffer);
                            return await getDownloadURL(res.ref);
                        })();
                    }

                    const [newProfileUrl, newEntries, newTourGuideUrl] = await Promise.all([
                        uploadProfileTask,
                        uploadEntriesTask,
                        uploadTourGuideTask
                    ]);

                    finalAvatarUrl = newProfileUrl || finalProfilePhotoUrl;

                    // Re-merge with uploaded entries to preserve other services
                    if (bSnap.exists()) {
                        const existing = existingData.services || [];
                        const currentCategoryIds = Array.from(new Set(newEntries.map((e: any) => e.categoryId)));
                        const others = existing.filter((s: any) => !currentCategoryIds.includes(s.categoryId));
                        finalizedServices = [...others, ...newEntries];
                    } else {
                        finalizedServices = newEntries;
                    }

                    finalPortfolioFull = Array.from(new Set(
                        finalizedServices.flatMap((e: any) => normalizeImageList(e.portfolioImages || e.portfolio || e.images || []))
                    ));

                    setSubmittingStatus("Finalizing...");
                    const mediaUpdates = {
                        avatar: finalAvatarUrl,
                        profilePhotoURL: finalAvatarUrl,
                        photoURL: newProfileUrl ? finalAvatarUrl : updateData.photoURL,
                        services: finalizedServices,
                        portfolio: finalPortfolioFull,
                        images: finalPortfolioFull,
                        tourGuideAuthorizationUrl: newTourGuideUrl || finalTourGuideAuthUrl || existingData.tourGuideAuthorizationUrl
                    };
                    await updateDoc(bricolerRef, mediaUpdates);

                    // Update city_index with final data
                    if (selectedCity) {
                        await writeCityIndex(user.uid, selectedCity, {
                            ...updateData,
                            ...mediaUpdates
                        }).catch(console.warn);
                    }
                } catch (mediaError) {
                    console.error("Media upload failed during update:", mediaError);
                    showToast({
                        variant: 'info',
                        title: t({ en: 'Photo upload issue', fr: 'Problème de photos' }),
                        description: t({ en: 'Your information was saved but some photos failed to upload.', fr: 'Vos informations ont été enregistrées mais certaines photos n\'ont pas pu être téléversées.' })
                    });
                }
            }

            showToast({ title: t({ en: 'Successfully updated!', fr: 'Mis à jour avec succès !' }), variant: 'success' });
            onComplete({
                ...updateData,
                services: finalizedServices,
                portfolio: finalPortfolioFull,
                images: finalPortfolioFull,
                avatar: finalAvatarUrl,
                profilePhotoURL: finalAvatarUrl
            });
            onClose();
        } catch (error: any) {
            console.error("Update error:", error);
            showToast({ title: error.message || "Update failed", variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };
    const canGoNext = () => {
        if (step === 'language') return true;
        if (step === 'activation') return hasCode === false || (hasCode === true && localUserData !== null);
        if (step === 'services') return selectedSubServices.length > 0;
        if (step === 'car_selection') return selectedCars.length > 0;
        if (step === 'car_pricing') return selectedCars.length > 0 && selectedCars.every(c => c.quantity > 0 && (c.pricePerDay > 0 || c.price > 0));
        if (step === 'service_details') return currentEntryValid(currentCatEntry);
        if (step === 'city') return selectedCity !== '';
        if (step === 'moving_selection') return movingTransports.length > 0;
        if (step === 'areas') return selectedAreas.length > 0;
        if (step === 'profile') return fullName.trim().length > 2 && whatsappNumber.length >= 9;
        return true;
    };

    const goNext = () => {
        if (!canGoNext()) return;
        setDirection(1);
        if (step === 'service_details' && currentCatIdx < selectedCategoryIds.length - 1) {
            setCurrentCatIdx(i => i + 1);
            setEquipmentSearch('');
            setTimeout(() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80);
            return;
        }
        if (stepIndex < totalSteps - 1) setStepIndex(s => s + 1);
        setTimeout(() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80);
    };

    const goBack = () => {
        setDirection(-1);
        if (step === 'service_details' && currentCatIdx > 0) {
            setCurrentCatIdx(i => i - 1);
            setEquipmentSearch('');
            return;
        }
        if (stepIndex > 0) setStepIndex(s => s - 1);
    };

    // ── Service selection ────────────────────────────────────────────────────
    const toggleSubService = (catId: string, subSvcId: string) => {
        const isSelected = selectedSubServices.includes(subSvcId);
        if (isSelected) {
            setSelectedSubServices(prev => prev.filter(id => id !== subSvcId));
        } else {
            setSelectedSubServices(prev => [...prev, subSvcId]);
            // If we don't have an entry for this category yet, create a default one
            if (!categoryEntries[catId]) {
                const tier = SERVICE_TIER_RATES[catId];
                const cat = ALL_SERVICES.find(s => s.id === catId);
                setCategoryEntries(prev => ({
                    ...prev,
                    [catId]: {
                        categoryId: catId,
                        categoryName: cat?.name || catId,
                        hourlyRate: tier?.suggestedMin || 75,
                        pitch: '',
                        experience: '',
                        equipments: [],
                        noEquipment: NO_EQUIPMENT_SERVICES.includes(catId),
                        portfolioImages: [],
                        spokenLanguages: [],
                    }
                }));
            }
        }
    };

    const updateCatEntry = (id: string, key: keyof CategoryDetail, value: any) => {
        setCategoryEntries(prev => ({
            ...prev,
            [id]: { ...prev[id], [key]: value }
        }));
    };

    const addEquipment = (id: string, eq: string) => {
        const entry = categoryEntries[id];
        if (!entry || entry.equipments.includes(eq)) return;
        updateCatEntry(id, 'equipments', [...entry.equipments, eq]);
        updateCatEntry(id, 'noEquipment', false);
    };

    const removeEquipment = (id: string, eq: string) => {
        const entry = categoryEntries[id];
        if (!entry) return;
        updateCatEntry(id, 'equipments', entry.equipments.filter(e => e !== eq));
    };

    const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs);
            })
        ]);
    };

    const wait = async (ms: number) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
    };

    const isRetryableStorageError = (error: any): boolean => {
        const code = String(error?.code || '').toLowerCase();
        const message = String(error?.message || '').toLowerCase();
        return (
            code.includes('storage/unauthorized') ||
            code.includes('storage/unauthenticated') ||
            code.includes('storage/retry-limit-exceeded') ||
            code.includes('permission-denied') ||
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('permission') ||
            message.includes('unauthorized')
        );
    };

    const normalizeCategoryKey = (value?: string): string => {
        return (value || '').trim() || 'general';
    };

    const attachUploadedImagesToEntries = async (ownerId: string, entries: any[]): Promise<any[]> => {
        const categoryIds = Array.from(new Set(entries.map((entry) => normalizeCategoryKey(entry?.categoryId))));
        const uploadedByCategory = new Map<string, string[]>();

        await Promise.all(categoryIds.map(async (categoryId) => {
            const sourceEntry = entries.find((entry) => normalizeCategoryKey(entry?.categoryId) === categoryId);
            const sourceImages = normalizeImageList(
                sourceEntry?.portfolioImages || sourceEntry?.portfolio || sourceEntry?.images || []
            );
            const uploadedCategoryImages = await resolveServiceImagesForCategory(ownerId, categoryId, sourceImages);
            uploadedByCategory.set(categoryId, uploadedCategoryImages);
        }));

        return entries.map((entry) => {
            const categoryId = normalizeCategoryKey(entry?.categoryId);
            const uploadedCategoryImages = uploadedByCategory.get(categoryId) || [];
            return {
                ...entry,
                categoryId,
                portfolioImages: uploadedCategoryImages,
                portfolio: uploadedCategoryImages,
                images: uploadedCategoryImages,
            };
        });
    };

    const entryHasPendingImageUploads = (entry: any): boolean => {
        const images = normalizeImageList(entry?.portfolioImages || entry?.portfolio || entry?.images || []);
        return images.some((img) => isImageDataUrl(img));
    };

    const stripPendingImagesFromEntries = (entries: any[]): any[] => {
        return entries.map((entry) => {
            const persistedImages = normalizeImageList(entry?.portfolioImages || entry?.portfolio || entry?.images || [])
                .filter((img) => !isImageDataUrl(img));
            return {
                ...entry,
                categoryId: normalizeCategoryKey(entry?.categoryId),
                portfolioImages: persistedImages,
                portfolio: persistedImages,
                images: persistedImages,
            };
        });
    };

    const handlePortfolioSelection = async (categoryId: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        try {
            setIsProcessingPortfolioImages(true);
            const current = categoryEntries[categoryId];
            const existing = normalizeImageList(current?.portfolioImages || []);
            const remainingSlots = Math.max(0, 10 - existing.length);
            if (remainingSlots === 0) {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Maximum reached', fr: 'Maximum atteint', ar: 'تم بلوغ الحد الأقصى' }),
                    description: t({ en: 'You can upload up to 10 photos per service.', fr: 'Vous pouvez téléverser jusqu’à 10 photos par service.', ar: 'يمكنك رفع 10 صور كحد أقصى لكل خدمة.' })
                });
                return;
            }

            const selected = Array.from(files).slice(0, remainingSlots);
            const compressedImages = await Promise.all(
                selected.map((file) => compressImageFileToDataUrl(file, {
                    maxWidth: 1000,
                    maxHeight: 1000,
                    quality: 0.45,
                    mimeType: 'image/jpeg',
                }))
            );
            updateCatEntry(categoryId, 'portfolioImages', [...existing, ...compressedImages]);
        } catch (error) {
            console.error("Failed to process portfolio images:", error);
            showToast({
                variant: 'error',
                title: t({ en: 'Upload failed', fr: 'Échec du téléversement', ar: 'فشل الرفع' }),
                description: t({ en: 'Could not process selected images.', fr: 'Impossible de traiter les images sélectionnées.', ar: 'تعذر معالجة الصور المحددة.' })
            });
        } finally {
            setIsProcessingPortfolioImages(false);
        }
    };

    const removePortfolioImage = (categoryId: string, imageIndex: number) => {
        const entry = categoryEntries[categoryId];
        if (!entry) return;
        const next = entry.portfolioImages.filter((_, idx) => idx !== imageIndex);
        updateCatEntry(categoryId, 'portfolioImages', next);
    };

    const handleProfilePhotoSelection = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        try {
            setIsProcessingProfilePhoto(true);
            const compressed = await compressImageFileToDataUrl(file, {
                maxWidth: 800,
                maxHeight: 800,
                quality: 0.7,
                mimeType: 'image/jpeg',
            });
            setProfilePhotoUrl(compressed);
        } catch (error) {
            console.error("Failed to process profile photo:", error);
        } finally {
            setIsProcessingProfilePhoto(false);
        }
    };

    const handleIdSelect = async (side: 'front' | 'back', files: FileList | null) => {
        if (!files || files.length === 0) return;
        try {
            setIsUploadingId(true);
            const dataUrl = await compressImageFileToDataUrl(files[0], {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.8,
                mimeType: 'image/jpeg'
            });
            if (side === 'front') setIdFrontDataUrl(dataUrl);
            else setIdBackDataUrl(dataUrl);
        } catch (error) {
            console.error("ID processing failed:", error);
        } finally {
            setIsUploadingId(false);
        }
    };

    const uploadToCloudinary = async (dataUrl: string, folder: string, preset: string) => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dxgdmbcc2';
        if (!cloudName) {
            console.error("Cloudinary Error: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is missing in env");
            throw new Error('Cloud Name is not configured');
        }

        const formData = new FormData();
        formData.append('file', dataUrl);
        formData.append('upload_preset', preset);
        formData.append('folder', folder);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            let errorDetails: any = null;
            const rawBody = await res.text().catch(() => "No response body");

            try {
                errorDetails = JSON.parse(rawBody);
            } catch (e) {
                errorDetails = { message: rawBody };
            }

            // Log details in a way that provides info but doesn't necessarily crash the UI thread in some dev envs
            console.warn("Cloudinary upload rejected:", {
                status: res.status,
                statusText: res.statusText,
                details: errorDetails,
                preset,
                folder
            });

            throw new Error(errorDetails?.error?.message || errorDetails?.message || 'IMAGE_UPLOAD_REJECTED');
        }

        const data = await res.json();
        return data.secure_url;
    };

    const uploadToFirebase = async (dataUrl: string, path: string) => {
        const blob = await dataUrlToBlob(dataUrl);
        const storageRef = ref(storage, path);
        const res = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
        return await getDownloadURL(res.ref);
    };

    const uploadVerificationId = async (uid: string, side: 'front' | 'back', dataUrl: string) => {
        if (!dataUrl || !isImageDataUrl(dataUrl)) return null;
        try {
            console.log(`Uploading ID ${side} to Cloudinary...`);
            return await uploadToCloudinary(dataUrl, `lbricol/verification/${uid}`, 'lbricol_verification');
        } catch (e) {
            console.warn(`Cloudinary ID ${side} upload failed, trying Firebase:`, e);
            try {
                return await uploadToFirebase(dataUrl, `verification/${uid}/id-${side}.jpg`);
            } catch (fbErr) {
                console.error(`Both Cloudinary and Firebase failed for ID ${side}:`, fbErr);
                // Return original dataUrl as a last resort or null to avoid crashing the whole signup
                return null;
            }
        }
    };

    const resolveServiceImagesForCategory = async (ownerId: string, categoryId: string, images: string[]): Promise<string[]> => {
        const normalized = normalizeImageList(images).slice(0, 10);
        const folder = `lbricol/bricolers/${ownerId}/portfolio`;
        return (await Promise.all(
            normalized.map(async (image, idx) => {
                if (!isImageDataUrl(image)) return image;
                try {
                    return await uploadToCloudinary(image, folder, 'lbricol_portfolio');
                } catch (e) {
                    console.warn("Cloudinary Portfolio upload failed, falling back to Firebase:", e);
                    try {
                        return await uploadToFirebase(image, `bricolers/${ownerId}/portfolio/${categoryId}_${idx}_${Date.now()}.jpg`);
                    } catch (fe) {
                        console.error("Firebase upload fallback also failed:", fe);
                        return image;
                    }
                }
            })
        )).filter(Boolean) as string[];
    };

    const resolveProfilePhoto = async (ownerId: string, value: string): Promise<string> => {
        if (!value || !isImageDataUrl(value)) return value;
        try {
            return await uploadToCloudinary(value, `lbricol/bricolers/${ownerId}/avatar`, 'lbricol_avatars');
        } catch (e) {
            console.warn("Cloudinary Avatar upload failed, falling back to Firebase:", e);
            try {
                return await uploadToFirebase(value, `bricolers/${ownerId}/avatar/profile_${Date.now()}.jpg`);
            } catch (fe) {
                console.error("Firebase upload fallback also failed:", fe);
                return value;
            }
        }
    };

    if (!isOpen) return null;

    const isLastCat = currentCatIdx === selectedCategoryIds.length - 1;
    const pitchLen = currentCatEntry?.pitch?.trim().length || 0;
    const currentProfileAvatar = profilePhotoUrl || ((mode === 'onboarding') ? "" : (userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || auth.currentUser?.photoURL || ""));

    return (
        <>
            {/* Full-screen submission splash — separate AnimatePresence so keys never collide */}
            <AnimatePresence key="onboarding-splash-presence">
                {isSubmitting && (
                    <SplashScreen
                        key="onboarding-splash-indicator"
                        subStatus={submittingStatus}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence key="onboarding-modal-presence">
                <motion.div
                    key="onboarding-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-white z-[10001] flex flex-col"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className={cn(
                            "flex-1 flex flex-col w-full mx-auto overflow-hidden bg-white",
                            step !== 'base_location' && "max-w-[600px]"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        {isMobile && step !== 'base_location' && <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />}

                        {/* Header */}
                        {step !== 'base_location' && (
                            <>
                                <div className="flex items-center justify-between px-6 pt-4 pb-4 flex-shrink-0 relative">
                                    <div className="w-12">
                                        {stepIndex > 0 && (
                                            <motion.button
                                                whileTap={{ scale: 0.9 }}
                                                onClick={goBack}
                                                className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-50 text-neutral-400 hover:text-neutral-900 transition-colors"
                                            >
                                                <ChevronLeft size={24} strokeWidth={2.5} />
                                            </motion.button>
                                        )}
                                    </div>

                                    <h1 className="text-[19px] font-black text-neutral-900 tracking-tight">
                                        {step === 'services'
                                            ? t({ en: 'Start working', fr: 'Commencer à travailler', ar: 'ابدأ العمل' })
                                            : step === 'profile'
                                                ? t({ en: 'Your Profile', fr: 'Votre profil', ar: 'ملفك الشخصي' })
                                                : step === 'availability'
                                                    ? t({ en: 'Availability', fr: 'Disponibilité', ar: 'ساعات العمل' })
                                                    : t({ en: 'Onboarding', fr: 'Intégration', ar: 'الإعداد' })}
                                    </h1>

                                    <button
                                        onClick={onClose}
                                        className="w-10 h-5 flex items-center justify-center rounded-full text-[#01A083] hover:bg-[#E6F6F2] transition-colors"
                                    >
                                        <X size={26} strokeWidth={2.5} />
                                    </button>
                                </div>

                                {/* Simple Progress Bar */}
                                <div className="px-6 pb-2">
                                    <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(stepIndex / (totalSteps - 1)) * 100}%` }}
                                            className="h-full bg-[#01A083]"
                                            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Content */}
                        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto w-full relative z-[1]" style={{ paddingBottom: step === 'base_location' ? '0' : '70px', scrollbarWidth: 'none' }}>
                            <AnimatePresence mode="wait" custom={direction}>
                                {/* ── STEP: Language Selection ── */}
                                {step === 'language' && (
                                    <motion.div key="language" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">

                                            <div className="space-y-2">
                                                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
                                                    {t({ en: 'Choose your language', fr: 'Choisissez votre langue', ar: 'اختر لغتك' })}
                                                </h2>
                                                <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">
                                                    {t({ en: 'Select your preferred language to continue.', fr: 'Sélectionnez votre langue préférée pour continuer.', ar: 'اختر لغتك المفضلة للمتابعة.' })}
                                                </p>
                                            </div>
                                        </motion.div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {[
                                                { id: 'fr', label: 'Français', flag: '🇫🇷', sub: 'Préféré au Maroc' },
                                                { id: 'ar', label: 'العربية', flag: '🇲🇦', sub: 'اللغة الرسمية' },
                                                { id: 'en', label: 'English', flag: '🇺🇸', sub: 'International' },
                                            ].map((lang) => (
                                                <motion.button
                                                    key={lang.id}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        setLanguage(lang.id as any);
                                                        // Automatically go next for high speed onboarding
                                                        setTimeout(goNext, 300);
                                                    }}
                                                    className={cn(
                                                        "group flex items-center justify-between p-6 rounded-[24px] border-2 transition-all",
                                                        language === lang.id
                                                            ? "border-[#008C74] bg-[#E6F6F2] shadow-sm"
                                                            : "border-neutral-100 hover:border-neutral-200 bg-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110",
                                                            language === lang.id ? "bg-[#01A083] text-white" : "bg-neutral-50"
                                                        )}>
                                                            {lang.flag}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className={cn("text-lg font-bold", language === lang.id ? "text-[#008C74]" : "text-neutral-900")}>
                                                                {lang.label}
                                                            </div>
                                                            <div className="text-sm text-neutral-400 font-medium">
                                                                {lang.sub}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {language === lang.id && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-8 h-8 rounded-full bg-[#01A083] flex items-center justify-center text-white">
                                                            <Check size={18} strokeWidth={3} />
                                                        </motion.div>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Activation Code ── */}
                                {step === 'activation' && (
                                    <motion.div key="activation" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-3">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">
                                                {t({ en: 'Do you have an activation code?', fr: 'Avez-vous un code d\'activation ?', ar: 'هل لديك رمز تفعيل ؟' })}
                                            </h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">
                                                {t({ en: 'If an admin created a shadow profile for you, enter your code here.', fr: 'Si un administrateur a créé un profil pour vous, entrez votre code ici.', ar: 'إذا قام مسؤول بإنشاء حساب لك، أدخل الرمز الخاص بك هنا.' })}
                                            </p>
                                        </motion.div>

                                        <div className="space-y-6">
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setHasCode(true)}
                                                    className={cn(
                                                        "flex-1 p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3",
                                                        hasCode === true ? "border-[#01A083] bg-[#E6F6F2]" : "border-neutral-100 hover:border-neutral-200"
                                                    )}
                                                >

                                                    <span className="font-bold text-neutral-900">{t({ en: 'Yes, I have one', fr: 'Oui, j\'en ai un', ar: 'نعم، لدي واحد' })}</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setHasCode(false);
                                                        setStepIndex(s => s + 1);
                                                    }}
                                                    className={cn(
                                                        "flex-1 p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3",
                                                        hasCode === false ? "border-[#01A083] bg-[#E6F6F2]" : "border-neutral-100 hover:border-neutral-200"
                                                    )}
                                                >

                                                    <span className="font-bold text-neutral-900">{t({ en: 'No, skip this', fr: 'Non, passer', ar: 'لا، تجاوز' })}</span>
                                                </button>
                                            </div>

                                            {hasCode === true && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="space-y-4 pt-4"
                                                >
                                                    <div className="relative">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                                                            <Sparkles size={20} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={activationCode}
                                                            onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                                                            placeholder="EX: ABC-123"
                                                            className="w-full bg-white border-2 border-neutral-100 rounded-[20px] pl-12 pr-4 py-4 font-mono font-bold text-lg text-neutral-900 focus:border-[#01A083] outline-none transition-all placeholder:text-neutral-300"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleVerifyCode}
                                                        disabled={!activationCode.trim() || isSubmitting}
                                                        className="w-full h-14 bg-[#01A083] text-white rounded-full font-black text-[15px] uppercase tracking-wider shadow-lg shadow-[#01A083]/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                                    >
                                                        {isSubmitting ? (
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                                        ) : (
                                                            t({ en: 'Verify and Continue', fr: 'Vérifier et continuer', ar: 'تحقق واستمر' })
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setHasCode(null)}
                                                        className="w-full text-center text-neutral-400 text-xs font-bold uppercase tracking-widest hover:text-neutral-600 transition-colors"
                                                    >
                                                        {t({ en: 'Go back', fr: 'Retour', ar: 'رجوع' })}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Services ── */}
                                {step === 'services' && (
                                    <motion.div key="services" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'What will your offer?', fr: 'Qu\'est-ce que vous offrez?', ar: 'ماذا ستعرض؟' })}</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Pick one or more Services and subservices.', fr: 'Choisissez un ou plusieurs Services et sous-services.', ar: 'اختر خدمة واحدة أو أكثر والخدمات الفرعية.' })}</p>
                                        </motion.div>

                                        {/* Category Selectors (Top Horizontal) */}
                                        <div
                                            className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2"
                                            style={{ scrollbarWidth: 'none' }}
                                        >
                                            {ALL_SERVICES.map((cat, idx) => {
                                                const isActive = activeCategoryId === cat.id;
                                                const hasSelected = selectedSubServices.some(subId => cat.subServices.some(s => s.id === subId));
                                                return (
                                                    <motion.button
                                                        key={cat.id}
                                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        onClick={() => setActiveCategoryId(cat.id)}
                                                        className="flex flex-col items-center gap-3 px-1 pt-4 pb-3 flex-shrink-0 relative transition-all"
                                                    >
                                                        {/* Icon organic loop (blue behind when active) */}
                                                        <motion.div
                                                            animate={isActive ? {
                                                                borderRadius: [
                                                                    '60% 40% 30% 70% / 60% 30% 70% 40%',
                                                                    '30% 60% 70% 40% / 50% 60% 30% 60%',
                                                                    '60% 40% 30% 70% / 60% 30% 70% 40%'
                                                                ],
                                                                rotate: [-10, 5, -10],
                                                                scale: [1.05, 1.08, 1.05]
                                                            } : {
                                                                borderRadius: '50%',
                                                                rotate: 0,
                                                                scale: 1
                                                            }}
                                                            transition={isActive ? {
                                                                duration: 6,
                                                                repeat: Infinity,
                                                                ease: "easeInOut"
                                                            } : {
                                                                duration: 0.3
                                                            }}
                                                            style={{
                                                                width: 90,
                                                                height: 90,
                                                                backgroundColor: isActive ? '#FFB700' : hasSelected ? '#ffffffff' : '#FFFFFF',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: (isActive || hasSelected) ? 'none' : '1.5px solid #F0F0F0',
                                                            }}
                                                            className="relative"
                                                        >
                                                            {hasSelected && (
                                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#01A083] rounded-full flex items-center justify-center shadow-md z-20 border-2 border-white">
                                                                    <Check size={12} strokeWidth={4} className="text-white" />
                                                                </div>
                                                            )}
                                                            <img
                                                                src={getServiceVector(cat.id)}
                                                                className="w-14 h-14 object-contain transition-all duration-300"
                                                                alt={cat.name}
                                                            />
                                                        </motion.div>

                                                        <span
                                                            className="text-[14px] font-bold whitespace-nowrap mt-1"
                                                            style={{
                                                                color: isActive || hasSelected ? '#037B3E' : '#666',
                                                            }}
                                                        >
                                                            {t({ en: cat.name, fr: cat.name })}
                                                        </span>

                                                        {isActive && (
                                                            <motion.div
                                                                layoutId="category-indicator"
                                                                className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#037B3E] rounded-full"
                                                                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                                            />
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {/* Sub-category Pill Chips (Animated Pop Entrance) */}
                                        <div className="space-y-4 pt-4 overflow-hidden min-h-[160px]">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={activeCategoryId}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex flex-wrap gap-2"
                                                >
                                                    {ALL_SERVICES.find(c => c.id === activeCategoryId)?.subServices.map((sub, idx) => {
                                                        const isSelected = selectedSubServices.includes(sub.id);
                                                        return (
                                                            <motion.button
                                                                key={sub.id}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: idx * 0.03 }}
                                                                onClick={() => toggleSubService(activeCategoryId, sub.id)}
                                                                className={cn(
                                                                    "px-5 py-2.5 rounded-full border-2 transition-all text-[14px] font-bold",
                                                                    isSelected
                                                                        ? "border-[#01A083] bg-[#01A083] text-white shadow-md"
                                                                        : "border-neutral-100 bg-white text-black hover:border-neutral-300"
                                                                )}
                                                            >
                                                                {(() => {
                                                                    const cat = SERVICES_CATALOGUE.find(c => c.id === activeCategoryId);
                                                                    const catalogueSub = cat?.subServices.find(s => s.id === sub.id);
                                                                    if (catalogueSub) {
                                                                        return t({ en: catalogueSub.en, fr: catalogueSub.fr, ar: catalogueSub.ar });
                                                                    }
                                                                    return t(sub.desc || { en: sub.name, fr: sub.name, ar: sub.name });
                                                                })()}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Car Selection ── */}
                                {step === 'car_selection' && (
                                    <motion.div key="car_selection" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Select your cars', fr: 'Sélectionnez vos voitures', ar: 'اختر سياراتك' })}</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Select the car brands and models you offer for rental.', fr: 'Sélectionnez les marques et modèles de voitures que vous proposez à la location.', ar: 'اختر ماركات وموديلات السيارات التي تقدمها للإيجار.' })}</p>
                                        </motion.div>

                                        {/* Brand Logos (Horizontal Scroll) */}
                                        <div className="flex gap-6 overflow-x-auto no-scrollbar py-4 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
                                            {CAR_BRANDS.map((brand) => {
                                                const isActive = activeBrandId === brand.id;
                                                const hasSelected = selectedCars.some(c => c.brandId === brand.id);
                                                return (
                                                    <motion.button
                                                        key={brand.id}
                                                        whileTap={{ scale: 0.95 }}
                                                        whileHover={{ y: -2 }}
                                                        onClick={() => setActiveBrandId(brand.id)}
                                                        className="flex flex-col items-center gap-2 flex-shrink-0"
                                                    >
                                                        <motion.div
                                                            animate={{
                                                                scale: isActive ? 1.05 : 1,
                                                                borderColor: isActive ? '#01A083' : '#F0F0F0'
                                                            }}
                                                            className={cn(
                                                                "w-16 h-16 rounded-2xl flex items-center justify-center p-2 transition-all relative",
                                                                isActive ? "bg-[#01A083]/10 border-2" : "bg-white border-2 border-neutral-100"
                                                            )}
                                                        >
                                                            <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
                                                            {hasSelected && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-[#01A083] rounded-full flex items-center justify-center border-2 border-white"
                                                                >
                                                                    <Check size={10} className="text-white" strokeWidth={4} />
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                        <span className={cn("text-xs font-black transition-colors", isActive ? "text-[#01A083]" : "text-neutral-500")}>
                                                            {brand.name}
                                                        </span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {/* Car Models Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <AnimatePresence mode="popLayout">
                                                {CAR_BRANDS.find(b => b.id === activeBrandId)?.models.map((model, idx) => {
                                                    const isSelected = selectedCars.some(c => c.modelId === model.id);
                                                    return (
                                                        <motion.button
                                                            key={`${activeBrandId}-${model.id}`}
                                                            initial={{ opacity: 0, scale: 0.9, y: 15, rotateX: 15 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9, y: 10, rotateX: -10 }}
                                                            transition={{
                                                                duration: 0.4,
                                                                delay: idx * 0.04,
                                                                ease: [0.165, 0.84, 0.44, 1] // easeOutQuart for smooth emergence
                                                            }}
                                                            // ...rest stays same
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setSelectedCars(prev => prev.filter(c => c.modelId !== model.id));
                                                                } else {
                                                                    const brand = CAR_BRANDS.find(b => b.id === activeBrandId);
                                                                    setSelectedCars(prev => [...prev, {
                                                                        brandId: activeBrandId,
                                                                        brandName: brand?.name,
                                                                        modelId: model.id,
                                                                        modelName: model.name,
                                                                        modelImage: model.image,
                                                                        quantity: 1,
                                                                        pricePerDay: 300 // default price
                                                                    }]);
                                                                }
                                                            }}
                                                            className={cn(
                                                                "group p-4 rounded-3xl border-2 transition-all text-left space-y-3",
                                                                isSelected ? "border-[#01A083] bg-[#E6F6F2]" : "border-neutral-100 bg-white"
                                                            )}
                                                        >
                                                            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-50 p-2">
                                                                <motion.img
                                                                    initial={{ scale: 1.2, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    transition={{ delay: idx * 0.03 + 0.1, duration: 0.5 }}
                                                                    src={model.image}
                                                                    alt={model.name}
                                                                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-neutral-900">{model.name}</span>
                                                                <div className={cn(
                                                                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                                    isSelected ? "bg-[#01A083] border-[#01A083] text-white" : "border-neutral-200"
                                                                )}>
                                                                    {isSelected && <Check size={14} strokeWidth={4} />}
                                                                </div>
                                                            </div>
                                                        </motion.button>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Car Pricing ── */}
                                {step === 'car_pricing' && (
                                    <motion.div key="car_pricing" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Set quantity and price', fr: 'Définir la quantité et le prix', ar: 'حدد الكمية والسعر' })}</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Set the number of available cars and daily rental price for each model.', fr: 'Définissez le nombre de voitures disponibles et le prix de location journalier pour chaque modèle.', ar: 'حدد عدد السيارات المتوفرة وسعر الإيجار اليومي لكل موديل.' })}</p>
                                        </motion.div>

                                        <div className="space-y-6">
                                            {selectedCars.map((car, idx) => (
                                                <div key={`${car.brandId}-${car.modelId}`} className="bg-white border-2 border-neutral-100 rounded-3xl p-6 space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-20 h-15 bg-neutral-50 rounded-xl overflow-hidden p-2">
                                                            <img src={car.modelImage || car.image} alt={car.modelName} className="w-full h-full object-contain" />
                                                        </div>
                                                        <div>
                                                            <div className="text-xs font-black text-[#01A083] uppercase tracking-wider">{car.brandName}</div>
                                                            <div className="text-lg font-bold text-neutral-900">{car.modelName}</div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Quantity', fr: 'Quantité', ar: 'الكمية' })}</label>
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={() => {
                                                                        const next = [...selectedCars];
                                                                        next[idx].quantity = Math.max(1, next[idx].quantity - 1);
                                                                        setSelectedCars(next);
                                                                    }}
                                                                    className="w-10 h-10 rounded-xl border-2 border-neutral-100 flex items-center justify-center hover:bg-neutral-50"
                                                                >
                                                                    <Minus size={18} />
                                                                </button>
                                                                <span className="text-xl font-bold w-6 text-center">{car.quantity}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const next = [...selectedCars];
                                                                        next[idx].quantity += 1;
                                                                        setSelectedCars(next);
                                                                    }}
                                                                    className="w-10 h-10 rounded-xl border-2 border-neutral-100 flex items-center justify-center hover:bg-neutral-50"
                                                                >
                                                                    <Plus size={18} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Price / Day (MAD)', fr: 'Prix / Jour (DH)', ar: 'السعر / اليوم (درهم)' })}</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={car.pricePerDay || car.price}
                                                                    onChange={(e) => {
                                                                        const next = [...selectedCars];
                                                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                        if (next[idx].pricePerDay !== undefined) {
                                                                            next[idx].pricePerDay = val;
                                                                        }
                                                                        next[idx].price = val;
                                                                        setSelectedCars(next);
                                                                    }}
                                                                    className="w-full bg-neutral-50 border-none rounded-2xl px-4 py-3 font-bold text-lg outline-none focus:ring-2 focus:ring-[#01A083]/20"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Per-Service Details ── */}
                                {step === 'service_details' && currentCatEntry && (
                                    <motion.div
                                        key={currentCatId}
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        className="p-6 md:p-10 space-y-8 pb-10"
                                    >
                                        {selectedCategoryIds.length > 1 && (
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {selectedCategoryIds.map((id, idx) => {
                                                    const s = categoryEntries[id];
                                                    const done = currentEntryValid(categoryEntries[id]);
                                                    return (
                                                        <div
                                                            key={id}
                                                            onClick={() => { setDirection(idx > currentCatIdx ? 1 : -1); setCurrentCatIdx(idx); setEquipmentSearch(''); }}
                                                            className={cn(
                                                                'flex items-center gap-2 px-6 py-3 rounded-[12px] text-[13px] font-bold whitespace-nowrap border-2 transition-all cursor-pointer relative group',
                                                                idx === currentCatIdx ? 'bg-[#E6F6F2] text-[#01A083] border-[#01A083]' : done ? 'bg-[#01A083]/5 text-[#01A083]/60 border-neutral-100' : 'bg-white text-neutral-400 border-neutral-100'
                                                            )}
                                                        >
                                                            {done && <Check size={12} strokeWidth={4} />}
                                                            {t({ en: s?.categoryName || id, fr: s?.categoryName || id })}

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Filter out all subservices belonging to this category
                                                                    const svc = ALL_SERVICES.find(cat => cat.id === id);
                                                                    if (svc) {
                                                                        const subIds = svc.subServices.map(ss => ss.id);
                                                                        setSelectedSubServices(prev => prev.filter(x => !subIds.includes(x)));
                                                                    }
                                                                    // Remove from entries
                                                                    setCategoryEntries(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[id];
                                                                        return next;
                                                                    });
                                                                    // Adjust currentCatIdx if needed
                                                                    if (idx <= currentCatIdx && currentCatIdx > 0) {
                                                                        setCurrentCatIdx(prev => prev - 1);
                                                                    }
                                                                }}
                                                                className="ml-1 w-4 h-4 rounded-full bg-black/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <X size={10} strokeWidth={4} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                            <div className="flex items-center gap-4">
                                                <div className="w-[85px] h-[85px] flex-shrink-0">
                                                    <img
                                                        src={getServiceVector(currentCatEntry.categoryId)}
                                                        className="w-full h-full object-contain"
                                                        alt={currentCatEntry.categoryName}
                                                    />
                                                </div>
                                                <div>
                                                    <h2 className="text-3xl font-black text-neutral-900 leading-tight">{t({ en: currentCatEntry.categoryName, fr: currentCatEntry.categoryName })}</h2>
                                                    <p className="text-[#01A083] text-xs font-black tracking-widest uppercase">{t({ en: 'Service Category', fr: 'Catégorie de service', ar: 'فئة الخدمة' })}</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* 1. Experience */}
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                            <label className="text-[20px] font-medium text-neutral-900 flex items-center gap-2">
                                                {t({
                                                    en: `How much experience do you have in ${currentCatEntry.categoryName}?`,
                                                    fr: `Combien d'expérience avez-vous en ${t({ en: currentCatEntry.categoryName, fr: currentCatEntry.categoryName })} ?`,
                                                    ar: `كم عدد سنوات خبرتك في ${t({ en: currentCatEntry.categoryName, fr: currentCatEntry.categoryName })}؟`
                                                })}
                                            </label>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    { en: 'No Experience', fr: 'Sans expérience', ar: 'بدون خبرة' },
                                                    { en: '6 Months', fr: '6 Mois', ar: '6 أشهر' },
                                                    { en: '1 Year', fr: '1 An', ar: 'سنة واحدة' },
                                                    { en: '2 Years', fr: '2 Ans', ar: 'سنتان' },
                                                    { en: '3-5 Years', fr: '3-5 Ans', ar: '3-5 سنوات' },
                                                    { en: '5-10 Years', fr: '5-10 Ans', ar: '5-10 سنوات' },
                                                    { en: '10-15 Years', fr: '10-15 Ans', ar: '10-15 سنة' },
                                                    { en: '15+ Years', fr: '15+ Ans', ar: '+15 سنة' },
                                                ].map(val => (
                                                    <button
                                                        key={val.en}
                                                        onClick={() => updateCatEntry(currentCatId, 'experience', val.en)}
                                                        className={cn(
                                                            "px-3 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all",
                                                            currentCatEntry.experience === val.en ? "bg-[#E6F6F2] text-[#01A083] border-[#01A083]" : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200"
                                                        )}
                                                    >
                                                        {t(val)}
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>

                                        {/* 1.5 — Errands: How do you travel the city? */}
                                        {currentCatId === 'errands' && currentCatEntry.experience !== '' && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                                <label className="text-[20px] font-bold text-neutral-900 block">
                                                    {t({ en: 'How do you travel the city?', fr: 'Comment vous déplacez-vous en ville ?', ar: 'كيف تتنقل في المدينة؟' })}
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'car', label: { en: '🚗 Car', fr: '🚗 Voiture', ar: '🚗 سيارة' } },
                                                        { id: 'walking', label: { en: '🚶 Walking', fr: '🚶 À pied', ar: '🚶 مشيًا' } },
                                                        { id: 'airbike', label: { en: '🚲 AirBike', fr: '🚲 AirBike', ar: '🚲 دراجة هوائية' } },
                                                        { id: 'motorbike', label: { en: '🏍️ Motorbike', fr: '🏍️ Moto', ar: '🏍️ دراجة نارية' } },
                                                        { id: 'escooter', label: { en: '🛴 E-Scooter', fr: '🛴 Trottinette', ar: '🛴 سكوتر كهربائي' } },
                                                        { id: 'other', label: { en: 'Other', fr: 'Autre', ar: 'أخرى' } },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setErrandsTransport(opt.id)}
                                                            className={cn(
                                                                'px-3 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all text-left',
                                                                errandsTransport === opt.id
                                                                    ? 'bg-[#E6F6F2] text-[#01A083] border-[#01A083]'
                                                                    : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                            )}
                                                        >
                                                            {t(opt.label)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* 1.6 — Moving help: What vehicle(s) do you use? */}
                                        {currentCatId === 'moving' && currentCatEntry.experience !== '' && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                                <label className="text-[20px] font-bold text-neutral-900 block">
                                                    {t({
                                                        en: 'What vehicle(s) do you use for moving jobs?',
                                                        fr: 'Quel(s) véhicule(s) utilisez-vous pour les missions de déménagement ?',
                                                        ar: 'ما هي وسيلة (أو وسائل) النقل التي تستعملها في مهام النقل؟'
                                                    })}
                                                </label>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {[
                                                        { id: 'triporteur', label: { en: '🛵 Triporteur', fr: '🛵 Triporteur', ar: '🛵 تربورتور' } },
                                                        { id: 'small_van', label: { en: '🚐 Small Van', fr: '🚐 Petit Van', ar: '🚐 سيارة "برلانكو"' } },
                                                        { id: 'large_van', label: { en: '🚚 Large Van', fr: '🚚 Grand Van', ar: '🚚 شاحنة فورد ترانزيت' } },
                                                        { id: 'small_truck', label: { en: '🚛 Small Truck', fr: '🚛 Petit Camion', ar: '🚛 شاحنة صغيرة' } },
                                                        { id: 'large_truck', label: { en: '🚚 Large Truck', fr: '🚚 Grand Camion', ar: '🚚 شاحنة كبيرة' } },
                                                        { id: 'labor_only', label: { en: '💪 Labor only', fr: '💪 Main-d’œuvre seule', ar: '💪 يد عاملة فقط' } },
                                                    ].map(opt => {
                                                        const isSelected = movingTransports.includes(opt.id);
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setMovingTransports(prev => prev.filter(id => id !== opt.id));
                                                                    } else {
                                                                        // If labor only is selected, maybe we should clear others? 
                                                                        // Actually let's allow combination since they might do both.
                                                                        setMovingTransports(prev => [...prev, opt.id]);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    'px-3 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all text-left flex items-center justify-between',
                                                                    isSelected
                                                                        ? 'bg-[#E6F6F2] text-[#01A083] border-[#01A083]'
                                                                        : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                                )}
                                                            >
                                                                {t(opt.label)}
                                                                {isSelected && <Check size={16} strokeWidth={3} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* 2. Equipment */}
                                        <AnimatePresence>
                                            {currentCatEntry.experience !== '' && !NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId) && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        {currentCatEntry.categoryId !== 'tour_guide' && (
                                                            <label className="text-[20px] font-medium text-neutral-900 flex items-center gap-2">
                                                                {t({ en: 'Which Equipment do you have?', fr: 'Quel équipement avez-vous ?', ar: 'ما هي المعدات التي تمتلكها؟' })}
                                                            </label>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {currentCatEntry.categoryId !== 'tour_guide' && (
                                                            <>
                                                                <div className="flex flex-wrap gap-2.5">
                                                                    {/* "I don't have tools" as first option */}
                                                                    {currentCatEntry.categoryId !== 'glass_cleaning' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                const newValue = !currentCatEntry.noEquipment;
                                                                                updateCatEntry(currentCatId, 'noEquipment', newValue);
                                                                                if (newValue) updateCatEntry(currentCatId, 'equipments', []);
                                                                            }}
                                                                            className={cn(
                                                                                "px-5 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all flex items-center justify-center gap-2 min-w-[120px] lg:min-w-0",
                                                                                currentCatEntry.noEquipment
                                                                                    ? "bg-[#01A083] border-[#01A083] text-white"
                                                                                    : "bg-white text-neutral-800 border-neutral-200 hover:border-[#008C74]/30"
                                                                            )}
                                                                        >
                                                                            {currentCatEntry.noEquipment && <Check size={16} strokeWidth={3} />}
                                                                            {t({ en: "I don't have tools", fr: "Je n'ai pas d'outils", ar: 'ليس لدي أدوات' })}
                                                                        </button>
                                                                    )}

                                                                    {(SERVICE_EQUIPMENT_SUGGESTIONS[currentCatEntry.categoryId] || []).map(eqObj => {
                                                                        const eqId = eqObj.en;
                                                                        const isAdded = currentCatEntry.equipments.includes(eqId);
                                                                        return (
                                                                            <button
                                                                                key={eqId}
                                                                                onClick={() => {
                                                                                    if (isAdded) {
                                                                                        removeEquipment(currentCatId, eqId);
                                                                                    } else {
                                                                                        addEquipment(currentCatId, eqId);
                                                                                        // If adding a tool, turn off "noEquipment"
                                                                                        updateCatEntry(currentCatId, 'noEquipment', false);
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    "px-5 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all flex items-center justify-center gap-2 min-w-[120px] lg:min-w-0",
                                                                                    isAdded ? "bg-[#E6F6F2] border-[#01A083] text-[#01A083]" : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200"
                                                                                )}
                                                                            >
                                                                                {isAdded && <Check size={16} strokeWidth={3} />}{t(eqObj)}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-white border-2 border-neutral-100 rounded-[22px] pl-5 pr-2 py-2 focus-within:border-[#01A083] transition-colors">
                                                                    <input type="text" placeholder={t({ en: 'Add other equipment...', fr: 'Ajouter un autre équipement...', ar: 'إضافة معدات أخرى...' })} value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && equipmentSearch.trim()) { e.preventDefault(); addEquipment(currentCatId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="flex-1 bg-transparent outline-none text-[15px] font-medium text-neutral-900 placeholder:text-neutral-400" />
                                                                    <button onClick={() => { if (equipmentSearch.trim()) { addEquipment(currentCatId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="px-5 py-3 bg-[#01A083] text-white rounded-[18px] text-[13px] font-black hover:bg-[#008C74] active:scale-95 transition-all">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })}</button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>



                                        {/* 1.7 — Tour Guide: Spoken Languages */}
                                        {currentCatId === 'tour_guide' && currentCatEntry.experience !== '' && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                                <label className="text-[20px] font-bold text-neutral-900 block">
                                                    {t({
                                                        en: 'Which languages do you speak?',
                                                        fr: 'Quelles langues parlez-vous ?',
                                                        ar: 'ما هي اللغات التي تتحدثها؟'
                                                    })}
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'arabic', label: { en: 'Arabic', fr: 'Arabe', ar: 'العربية' } },
                                                        { id: 'english', label: { en: 'English', fr: 'Anglais', ar: 'الإنجليزية' } },
                                                        { id: 'french', label: { en: 'French', fr: 'Français', ar: 'الفرنسية' } },
                                                        { id: 'spanish', label: { en: 'Spanish', fr: 'Espagnol', ar: 'الإسبانية' } },
                                                    ].map(lang => {
                                                        const isSelected = currentCatEntry.spokenLanguages?.includes(lang.id);
                                                        return (
                                                            <button
                                                                key={lang.id}
                                                                onClick={() => {
                                                                    const prev = currentCatEntry.spokenLanguages || [];
                                                                    const next = isSelected ? prev.filter(l => l !== lang.id) : [...prev, lang.id];
                                                                    updateCatEntry(currentCatId, 'spokenLanguages', next);
                                                                }}
                                                                className={cn(
                                                                    'px-3 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all text-left flex items-center justify-between',
                                                                    isSelected
                                                                        ? 'bg-[#E6F6F2] text-[#01A083] border-[#01A083]'
                                                                        : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                                )}
                                                            >
                                                                {t(lang.label)}
                                                                {isSelected && <Check size={16} strokeWidth={3} />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* 3. Hourly Rate — shows after equipment is set */}
                                        <AnimatePresence>
                                            {(currentCatEntry.noEquipment || currentCatEntry.equipments.length > 0 || NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId)) && currentCatEntry.categoryId !== 'car_rental' && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[20px] font-medium text-neutral-900 flex items-center gap-2">
                                                            {(() => {
                                                                const service = ALL_SERVICES.find(s => s.id === currentCatId);
                                                                const archetype = service?.subServices?.find(ss => selectedSubServices.includes(ss.id))?.pricingArchetype || 'hourly';
                                                                if (currentCatId === 'private_driver' || archetype === 'rental') return t({ en: "What's the daily rate you'd like to charge?", fr: "Quel tarif journalier souhaitez-vous ?", ar: "ما هو السعر اليومي؟" });
                                                                if (archetype === 'unit') return t({
                                                                    en: "What's the minimum hourly price you accept for this service?",
                                                                    fr: "Quel est le prix horaire minimum que vous acceptez pour ce service ?",
                                                                    ar: "ما هو الحد الأدنى للأجر بالساعة الذي تقبله مقابل هذه الخدمة؟"
                                                                });
                                                                if (currentCatId === 'errands') return t({ en: "What's the minimum price you accept for a simple delivery task?", fr: "Quel est le prix minimum que vous acceptez pour une simple mission de livraison ?", ar: "ما هو أقل ثمن تقبله مقابل مهمة توصيل بسيطة؟" });
                                                                return t({ en: "What's the minimum price you accept for this service?", fr: "Quel est le prix minimum que vous acceptez pour ce service ?", ar: "ما هو أقل ثمن تقبله مقابل هذه الخدمة؟" });
                                                            })()}
                                                        </label>
                                                    </div>
                                                    {/* Centered rate picker */}
                                                    <motion.div variants={itemVariants} className="bg-neutral-50 rounded-[32px] p-8 border border-neutral-100 flex flex-col items-center justify-center gap-6">
                                                        <div className="flex items-center justify-center gap-6 w-full">
                                                            <button
                                                                onClick={() => {
                                                                    const min = tierInfo?.suggestedMin || 15;
                                                                    const current = currentCatEntry?.hourlyRate || 75;
                                                                    if (current > min) {
                                                                        updateCatEntry(currentCatId, 'hourlyRate', current - 5);
                                                                    }
                                                                }}
                                                                className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#01A083] transition-all text-neutral-400 hover:text-[#01A083]"
                                                            >
                                                                <Minus size={24} strokeWidth={3} />
                                                            </button>
                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-baseline gap-1 whitespace-nowrap">
                                                                    <span className="text-5xl font-black text-neutral-900 tracking-tighter leading-none">{currentCatEntry?.hourlyRate || 75}</span>
                                                                    <span className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest">
                                                                        {(() => {
                                                                            const service = ALL_SERVICES.find(s => s.id === currentCatId);
                                                                            return t({ en: '(MAD)', fr: '(MAD)', ar: '(درهم)' });
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const max = tierInfo?.suggestedMax || 500;
                                                                    const current = currentCatEntry?.hourlyRate || 75;
                                                                    if (current < max) {
                                                                        updateCatEntry(currentCatId, 'hourlyRate', current + 5);
                                                                    }
                                                                }}
                                                                className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#01A083] transition-all text-neutral-400 hover:text-[#01A083]"
                                                            >
                                                                <Plus size={24} strokeWidth={3} />
                                                            </button>
                                                        </div>


                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* 4. Portfolio — Past Work */}
                                        <AnimatePresence>
                                            {(currentCatEntry.noEquipment || currentCatEntry.equipments.length > 0 || NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId)) && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-4 border-t border-neutral-50 mt-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[20px] font-medium text-neutral-900 flex items-center gap-2">
                                                            {t({ en: 'Portfolio: Images of your past work', fr: 'Portfolio : Images de vos travaux passés', ar: 'معرض الأعمال: صور لأعمالك السابقة' })}
                                                        </label>
                                                    </div>

                                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                                        {currentCatEntry.portfolioImages.map((img, idx) => (
                                                            <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-neutral-100 relative group cursor-pointer border-2 border-transparent hover:border-[#008C74]/20 transition-all">
                                                                <img src={img} className="w-full h-full object-cover" />
                                                                <button
                                                                    onClick={() => removePortfolioImage(currentCatId, idx)}
                                                                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:scale-110"
                                                                >
                                                                    <X size={14} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {currentCatEntry.portfolioImages.length < 10 && (
                                                            <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-100 flex flex-col items-center justify-center gap-2 hover:border-[#01A083] hover:bg-[#E6F6F2]/30 transition-all cursor-pointer group">
                                                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePortfolioSelection(currentCatId, e.target.files)} />
                                                                <div className="w-10 h-10 rounded-full bg-neutral-50 group-hover:bg-[#01A083] group-hover:text-white flex items-center justify-center text-neutral-400 transition-all">
                                                                    <Plus size={22} strokeWidth={3} />
                                                                </div>
                                                                <span className="text-[10px] font-black text-neutral-400 group-hover:text-[#01A083] uppercase tracking-[0.15em]">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })}</span>
                                                            </label>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-neutral-400 font-bold ml-1 italic">{t({ en: 'Show your best work to win clients (Max 10 photos)', fr: 'Montrez votre meilleur travail pour convaincre (Max 10)', ar: 'أظهر أفضل أعمالك لكسب العملاء (حد أقصى 10 صور)' })}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* 5. Experience Description — only shows after equipment is done */}
                                        <AnimatePresence>
                                            {(currentCatEntry.noEquipment || currentCatEntry.equipments.length > 0 || NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId)) && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[20px] font-medium text-neutral-900 flex items-center gap-2">
                                                            {t({ en: 'Why the client would choose you and not others?', fr: 'Pourquoi le client vous choisirait-il vous et pas les autres ?', ar: 'لماذا قد يختارك العميل دون غيرك؟' })}
                                                        </label>
                                                    </div>
                                                    <div className="flex flex-col gap-3">
                                                        <textarea
                                                            value={currentCatEntry?.pitch || ''}
                                                            onChange={e => updateCatEntry(currentCatId, 'pitch', e.target.value)}
                                                            placeholder={t({
                                                                en: `Share what makes you the best choice for this service. Your skills, reliability, and approach...`,
                                                                fr: `Partagez ce qui fait de vous le meilleur choix pour ce service. Vos compétences, votre fiabilité...`,
                                                                ar: `شارك ما الذي يجعلك الخيار الأفضل لهذه الخدمة. مهاراتك، مصداقيتك، وأسلوبك...`
                                                            })}
                                                            rows={5}
                                                            className={cn(
                                                                "w-full px-7 py-6 bg-white border-2 rounded-[32px] text-[17px] font-medium text-neutral-900 outline-none transition-all",
                                                                (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "border-[#008C74] bg-[#E6F6F2]/30" : "border-neutral-100 focus:border-[#01A083]"
                                                            )}
                                                        />
                                                        <div className="flex items-center gap-4 px-2">
                                                            <div className="flex-1 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full transition-all duration-300 rounded-full", (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "bg-[#01A083]" : "bg-[#01A083]/50")}
                                                                    style={{ width: `${Math.min(100, ((currentCatEntry?.pitch?.length || 0) / MIN_PITCH_CHARS) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={cn("text-[13px] font-black whitespace-nowrap", (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "text-[#01A083]" : "text-neutral-400")}>
                                                                {currentCatEntry?.pitch?.length || 0} / {MIN_PITCH_CHARS}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {/* Availability step removed — bricoler sets availability in their dashboard */}

                                {/* ── STEP: Base Location ── */}
                                {step === 'base_location' && (
                                    <div className="absolute inset-0 z-[100] bg-white">
                                        <div className="w-full h-full relative">
                                            <LocationPicker
                                                mode="single"
                                                serviceType="bricoler-base"
                                                serviceIcon="📍"
                                                autoLocate={true}
                                                onClose={goBack}
                                                isInline={true}
                                                initialRadius={serviceRadiusKm}
                                                onConfirmRadius={(radius) => {
                                                    setServiceRadiusKm(radius);
                                                }}
                                                onConfirm={({ pickup }) => {
                                                    setBaseLat(pickup.lat);
                                                    setBaseLng(pickup.lng);
                                                    setBaseAddress(pickup.address);

                                                    // Sync geocoded city and area to profile
                                                    if (pickup.city) setSelectedCity(pickup.city);
                                                    if (pickup.area) setSelectedAreas([pickup.area]);

                                                    setDirection(1);
                                                    setStepIndex(s => s + 1);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}



                                {/* ── STEP: Profile ── */}
                                {step === 'profile' && (
                                    <motion.div key="profile" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-10">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1 text-center">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Your Profile', fr: 'Votre profil', ar: 'ملفك الشخصي' })}</h2>
                                        </motion.div>
                                        <div className="space-y-6">
                                            {/* Professional Photo */}
                                            <motion.div variants={itemVariants} className="flex flex-col items-center gap-6">
                                                <label className="relative group cursor-pointer">
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfilePhotoSelection(e.target.files)} />
                                                    <div className="w-32 h-32 rounded-[32px] bg-neutral-100 border-1 border-white overflow-hidden flex items-center justify-center relative ring-4 ring-neutral-50 group-hover:ring-[#01A083]/20 transition-all">
                                                        {currentProfileAvatar ? (
                                                            <img src={currentProfileAvatar} alt="Profile" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                                        ) : (
                                                            <div className="w-full h-full bg-neutral-50 flex items-center justify-center">
                                                                <User size={64} className="text-neutral-200" strokeWidth={1.5} />
                                                            </div>
                                                        )}

                                                        {/* Hover Overlay */}
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                                            <div className="p-2 bg-white/90 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                                                <Camera size={20} className="text-[#01A083]" strokeWidth={2.5} />
                                                            </div>
                                                        </div>

                                                        {isUploadingProfile && (
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </label>
                                                <div className="text-center space-y-1">
                                                    <h3 className="text-[16px] font-black text-neutral-900">{t({ en: 'Professional Photo', fr: 'Photo professionnelle', ar: 'صورة مهنية' })}</h3>
                                                    <p className="text-[12px] text-neutral-500 font-medium max-w-[240px]">{t({ en: 'Bright, clear, and smiling photos get 3x more jobs.', fr: 'Une photo claire et souriante attire 3x plus de clients.', ar: 'الصور الواضحة والمبتسمة تجتذب 3 أضعاف الزبائن.' })}</p>
                                                </div>
                                            </motion.div>

                                            {/* ID Verification */}
                                            <motion.div variants={itemVariants} className=" rounded-[12px] p-6 border-2 border-dashed border-neutral-100 space-y-5">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-xl bg-[#01A083]/10 flex items-center justify-center text-[#01A083]">
                                                            <ShieldCheck size={18} strokeWidth={2.5} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[14px] font-[1000] text-black uppercase tracking-tight">{t({ en: 'ID Verification', fr: 'Vérification d\'ID', ar: 'توثيق الهوية' })}</span>
                                                            <span className="text-[10px] font-bold text-[#01A083] uppercase tracking-wider">{t({ en: 'Required for trust', fr: 'Requis pour la confiance', ar: 'مطلوب لكسب الثقة' })}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {[
                                                        { id: 'front', label: t({ en: 'Front Side', fr: 'Recto', ar: 'الوجه الأمامي' }), data: idFrontDataUrl },
                                                        { id: 'back', label: t({ en: 'Back Side', fr: 'Verso', ar: 'الوجه الخلفي' }), data: idBackDataUrl }
                                                    ].map((side) => (
                                                        <label key={side.id} className="relative group cursor-pointer">
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleIdSelect(side.id as any, e.target.files)} />
                                                            <div className={cn(
                                                                "aspect-[1.6/1] rounded-[10px] border-1 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden",
                                                                side.data ? "border-[#01A083] bg-white shadow-sm" : "border-neutral-200 bg-white hover:border-[#01A083]/30"
                                                            )}>
                                                                {side.data ? (
                                                                    <img src={side.data} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <>
                                                                        <div className="w-10 h-10 rounded-full  flex items-center justify-center text-neutral-400 group-hover:text-[#01A083] transition-colors">
                                                                            {side.id === 'front' ? <ScanEye size={22} /> : <ScanEye size={22} className="rotate-180" />}
                                                                        </div>
                                                                        <span className="text-[11px] font-[1000] text-neutral-400 group-hover:text-black uppercase tracking-tight">{side.label}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {side.data && (
                                                                <div className="absolute top-2 right-2 w-6 h-6 bg-[#01A083] text-white rounded-full flex items-center justify-center shadow-lg">
                                                                    <Check size={12} strokeWidth={4} />
                                                                </div>
                                                            )}
                                                        </label>
                                                    ))}
                                                </div>

                                                <div className="flex items-start gap-3 bg-[#01A083]/5 rounded-[10px] p-4 border border-[#01A083]/10">
                                                    <AlertTriangle size={16} className="text-[#01A083] mt-0.5 flex-shrink-0" />
                                                    <p className="text-[11px] font-bold text-[#01A083] leading-normal uppercase tracking-tight">
                                                        {t({
                                                            en: 'Your ID is strictly private and used only for internal verification. Never shared with clients.',
                                                            fr: 'Votre ID est strictement privé et utilisé uniquement pour la vérification interne.',
                                                            ar: 'بطاقة هويتك سرية للغاية وتستخدم فقط للتحقق الداخلي. لا يتم مشاركتها أبداً مع الزبائن.'
                                                        })}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        </div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Full Name', fr: 'Nom complet', ar: 'الاسم الكامل' })}</label>
                                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t({ en: 'Your full name', fr: 'Votre nom complet', ar: 'اسمك الكامل' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#01A083] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'WhatsApp Number', fr: 'Numéro WhatsApp', ar: 'رقم الواتساب' })}</label>
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className="px-3 md:px-5 py-4 bg-neutral-100 rounded-[12px] text-[15px] md:text-[16px] font-bold text-neutral-600 shrink-0">+212</div>
                                                    <input
                                                        type="tel"
                                                        value={whatsappNumber}
                                                        onChange={e => {
                                                            let val = e.target.value.replace(/\D/g, '');
                                                            if (val.startsWith('212')) val = val.slice(3);
                                                            if (val.startsWith('0')) val = val.slice(1);
                                                            // Limit to 9 digits starting with 6 or 7
                                                            if (val.length > 0 && !['6', '7'].includes(val[0])) return;
                                                            setWhatsappNumber(val.slice(0, 9));
                                                        }}
                                                        placeholder="6 00 00 00 00"
                                                        className="flex-1 min-w-0 px-4 md:px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[16px] md:text-[17px] font-bold text-neutral-900 outline-none focus:border-[#01A083] transition-all placeholder:font-medium placeholder:text-neutral-400"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-neutral-400 font-bold ml-1">{t({ en: '9 digits starting with 6 or 7', fr: '9 chiffres commençant par 6 ou 7', ar: '9 أرقام تبدأ بـ 6 أو 7' })}</p>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Sign Up ── */}
                                {step === 'finish' && (
                                    <motion.div key="finish" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-10 max-w-md mx-auto py-12">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-[#E6F6F2] rounded-[5px] p-8 space-y-6 border-2 border-[#01A083]/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#01A083]/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-[12px] border-2 border-white overflow-hidden bg-white shadow-sm">
                                                    <img src={currentProfileAvatar} alt="Profile" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#01A083]">{t({ en: 'Verified Pro', fr: 'Pro vérifié', ar: 'محترف موثق' })}</h3>
                                                        <div className="w-4 h-4 bg-[#FFCC02] rounded-full flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={5} /></div>
                                                    </div>
                                                    <p className="text-[24px] font-black text-neutral-900 tracking-tight leading-tight">{fullName}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-neutral-600 font-light text-[15px] backdrop-blur-sm px-4 py-2 rounded-[8px] w-fit italic opacity-50">
                                                    <MapPin size={18} className="text-neutral-400" />
                                                    {baseAddress || "Location set"}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedSubServices.map(id => {
                                                        const svc = ALL_SERVICES.find(s => s.subServices.some(ss => ss.id === id) || s.id === id);
                                                        const catId = svc?.id || '';
                                                        const entry = categoryEntries[catId];

                                                        // Ensure we get labels from SERVICES_CATALOGUE for better i18n
                                                        const catalogueCat = Object.values(SERVICES_CATALOGUE).find(c => c.subServices.some(ss => ss.id === id));
                                                        const ssMatch = catalogueCat?.subServices.find(ss => ss.id === id);
                                                        const subServiceLabel = ssMatch ? t({ en: ssMatch.en, fr: ssMatch.fr, ar: ssMatch.ar }) : (svc?.subServices?.find(ss => ss.id === id)?.name || id);

                                                        return (
                                                            <span
                                                                key={id}
                                                                className={cn(
                                                                    "px-4 py-2 rounded-[8px] text-[13px] font-bold transition-all flex items-center gap-2 relative group",
                                                                    entry?.categoryId === 'glass_cleaning'
                                                                        ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white"
                                                                        : "bg-[#0CB380] text-white"
                                                                )}
                                                            >
                                                                {subServiceLabel} · {entry?.hourlyRate} {t({ en: 'MAD', fr: 'MAD', ar: 'درهم' })}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedSubServices(prev => prev.filter(x => x !== id));
                                                                    }}
                                                                    className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all"
                                                                >
                                                                    <X size={10} strokeWidth={4} />
                                                                </button>
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
                                            <div className="space-y-2 text-center">
                                                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                                                    {mode === 'onboarding'
                                                        ? t({ en: 'Ready to Start?', fr: 'Prêt à commencer ?', ar: 'جاهز للبدء؟' })
                                                        : t({ en: 'Review Changes', fr: 'Vérifier les modifications', ar: 'مراجعة التعديلات' })}
                                                </h2>
                                                <p className="text-neutral-500 text-[15px] font-medium leading-relaxed px-4">
                                                    {mode === 'onboarding'
                                                        ? (auth.currentUser
                                                            ? t({ en: 'You are all set! Save your profile to start.', fr: 'Vous êtes prêt ! Enregistrez votre profil pour commencer.', ar: 'أنت جاهز تمامًا! احفظ ملفك الشخصي للبدء.' })
                                                            : t({ en: 'Connect Google to save your profile.', fr: 'Connectez Google pour enregistrer votre profile.', ar: 'اربط حساب جوجل لحفظ ملفك الشخصي.' }))
                                                        : t({ en: 'Save your updated service details.', fr: 'Enregistrez vos informations de service mises à jour.', ar: 'حفظ تفاصيل الخدمة المحدثة.' })}
                                                </p>
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={(mode === 'onboarding' || (mode === 'edit' && !userData?.uid)) ? handleBricolerSignup : (mode === 'admin_add' || mode === 'admin_edit') ? handleAdminSubmit : handleUpdateProfile}
                                                disabled={isSubmitting}
                                                className="w-full h-[64px] bg-[#0CB380] hover:bg-[#008C74] text-white rounded-full text-[18px] font-bold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-60"
                                            >
                                                {isSubmitting ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-5 h-5 border-[3px] border-white/40 border-t-white rounded-full animate-spin" />
                                                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                                            {submittingStatus && (
                                                                submittingStatus === 'Preparing...' ? t({ en: 'Preparing...', fr: 'Préparation...', ar: 'جاري التحضير...' }) :
                                                                    submittingStatus === 'Authenticating...' ? t({ en: 'Authenticating...', fr: 'Authentification...', ar: 'جاري التحقق...' }) :
                                                                        submittingStatus === 'Setting up your account...' ? t({ en: 'Setting up your account...', fr: 'Configuration du compte...', ar: 'جاري إعداد الحساب...' }) :
                                                                            submittingStatus === 'Saving profile...' ? t({ en: 'Saving profile...', fr: 'Enregistrement...', ar: 'جاري الحفظ...' }) :
                                                                                submittingStatus === 'Uploading media...' ? t({ en: 'Uploading media...', fr: 'Téléversement...', ar: 'جاري رفع الصور...' }) :
                                                                                    submittingStatus === 'Finalizing...' ? t({ en: 'Finalizing...', fr: 'Finalisation...', ar: 'جاري الإنهاء...' }) :
                                                                                        submittingStatus === 'Complete!' ? t({ en: 'Complete!', fr: 'Terminé !', ar: 'اكتمل بنجاح!' }) :
                                                                                            submittingStatus === 'Migrating data...' ? t({ en: 'Migrating data...', fr: 'Migration...', ar: 'نقل البيانات...' }) :
                                                                                                t({ en: submittingStatus, fr: submittingStatus })
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        {(mode === 'onboarding' || (mode === 'edit' && !userData?.uid)) ? (
                                                            <>
                                                                <FcGoogle size={28} className="bg-white rounded-full p-1" />
                                                                {t({ en: 'Continue with Google', fr: 'Continuer avec Google', ar: 'المتابعة باستخدام جوجل' })}
                                                            </>
                                                        ) : (mode === 'admin_add' || mode === 'admin_edit') ? (
                                                            <>
                                                                <Save size={24} />
                                                                {t({ en: 'Save Bricoler', fr: 'Enregistrer Bricoleur', ar: 'حفظ الحرفي' })}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save size={24} />
                                                                {t({ en: 'Save Changes', fr: 'Enregistrer les modifications', ar: 'حفظ التغييرات' })}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.button>

                                            {/*{!isSubmitting && (
                                                <button
                                                    onClick={onClose}
                                                    className="w-full py-4 text-neutral-400 font-bold hover:text-red-500 transition-colors"
                                                >
                                                    {t({ en: 'Discard Changes', fr: 'Ignorer les modifications', ar: 'تجاهل التعديلات' })}
                                                </button>
                                            )}*/}

                                            {mode === 'onboarding' && (
                                                <p className="text-[13px] text-neutral-400 leading-relaxed text-center font-bold px-4">
                                                    {t({ en: 'By proceeding, I agree to the', fr: 'En continuant, j’accepte les', ar: 'بالمتابعة، أوافق على' })} <span className="text-neutral-700 underline underline-offset-4 decoration-[#0CB380]/50 text-[#0CB380]">{t({ en: 'Terms', fr: 'Conditions', ar: 'الشروط' })}</span> {t({ en: 'and', fr: 'et la', ar: 'و' })} <span className="text-neutral-700 underline underline-offset-4 decoration-[#0CB380]/50 text-[#0CB380]">{t({ en: 'Privacy', fr: 'Confidentialité', ar: 'الخصوصية' })}</span>.
                                                </p>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div >

                        {/* Footer */}
                        {
                            step !== 'finish' && step !== 'google_signin' && step !== 'base_location' && (
                                <div className="p-4 md:p-6 pb-6 md:pb-8 bg-white border-t border-neutral-100 flex-shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={goNext}
                                        disabled={!canGoNext()}
                                        className="w-full h-16 bg-[#01A083] text-white rounded-full text-[18px] font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        {step === 'service_details' && !isLastCat
                                            ? t({ en: 'Next Category', fr: 'Catégorie suivante', ar: 'الفئة التالية' })
                                            : step === 'profile'
                                                ? t({ en: 'Save & Finish', fr: 'Enregistrer et terminer', ar: 'حفظ وإنهاء' })
                                                : t({ en: 'Continue', fr: 'Continuer', ar: 'متابعة' })}
                                        <ChevronRight size={22} strokeWidth={2.5} />
                                    </motion.button>
                                </div>
                            )
                        }
                    </motion.div >
                </motion.div >
            </AnimatePresence >
        </>
    );
};

export default OnboardingPopup;
