"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, CheckCircle2, Search, ChevronLeft, ChevronRight, FileText, Info, Plus, Minus, MapPin, ArrowRight, TrendingUp, User, Wrench, Save, Star, Key, Sparkles, Image
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
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
import { useLanguage } from '@/context/LanguageContext';
import SplashScreen from '@/components/layout/SplashScreen';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { isImageDataUrl, compressImageFileToDataUrl, dataUrlToBlob } from '@/lib/imageCompression';

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

const ALL_SERVICES = getAllServices().filter(s => !['driver', 'car_rental', 'courier', 'airport', 'transport_intercity'].includes(s.id));
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
const SERVICE_EQUIPMENT_SUGGESTIONS: Record<string, string[]> = {
    cleaning: [
        "Vacuum cleaner", "Steam mop", "Microfiber cloths",
        "Eco cleaning products", "Pressure washer", "Mop & bucket set"
    ],
    glass_cleaning: [
        "Squeegee & bucket", "Deionized water-fed pole", "Steam cleaner",
        "Scrapers (paint/residue)", "Extension poles", "Microfiber towels"
    ],
    plumbing: [
        "Pipe wrench set", "Drain snake / auger", "Pressure gauge",
        "Soldering kit", "Thread sealant tape", "Plunger"
    ],
    electricity: [
        "Digital multimeter", "Wire stripper", "Power drill",
        "Electrical tape", "Circuit tester", "Cable fish tape"
    ],
    painting: [
        "Paint rollers & trays", "Spray gun", "Brush set",
        "Masking tape", "Sandpaper set", "Drop cloths", "Ladder"
    ],
    handyman: [
        "Power drill", "Screwdriver set", "Level",
        "Hammer & nails", "Measuring tape", "Jigsaw / circular saw"
    ],
    furniture_assembly: [
        "Allen key set", "Power drill", "Rubber mallet",
        "Measuring tape", "Cable ties"
    ],
    mounting: [
        "Stud finder", "Laser level", "Power drill",
        "Wall anchor kit", "Cable management clips", "VESA mount adapters"
    ],
    appliance_installation: [
        "Drill & bits", "Pipe wrench", "Voltage tester",
        "Hosepipe connections", "Teflon tape", "Bubble level"
    ],
    moving: [
        "Moving blankets", "Hand truck / dolly", "Packing tape",
        "Stretch wrap", "Moving straps", "Furniture sliders"
    ],
    gardening: [
        "Lawn mower", "Hedge trimmer", "Pruning shears",
        "Garden hose", "Rake & shovel set", "Wheelbarrow"
    ],
    pool_cleaning: [
        "Pool skimmer / net", "Telescopic pole", "Pool brush set",
        "Water testing kit (DPD)", "Vacuum head & hose", "Chemical dispenser"
    ],
    pets_care: [
        "Leashes & harnesses", "Pet grooming kit", "Portable water bowl",
        "Pet first aid kit", "Waste bags", "Pet safe treats"
    ],
    babysitting: [
        "First aid kit", "Child safety gear", "Educational toys",
        "Board games", "Art & craft supplies", "Car seat (for transport)"
    ],
    elderly_care: [
        "First aid kit", "Blood pressure monitor", "Mobility aids (walker/cane)",
        "Medication organizer", "Emergency alert device", "Comfortable footwear"
    ],
    cooking: [
        "Professional knife set", "Specialty spices", "Apron & headwear",
        "Portable induction cooktop", "Kitchen scale", "Pastry tools"
    ],
    private_driver: [
        "Smartphone with GPS", "First aid kit", "Car air freshener",
        "Phone charger for passengers", "Umbrella", "Bottled water holder"
    ],
    learn_arabic: [
        "Lesson handouts / textbooks", "Whiteboard & markers", "Audio recordings",
        "Tablet / Laptop", "Flashcards"
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
    const { t } = useLanguage();
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

    // Optional bank details
    const [bankName, setBankName] = useState(userData?.bankName || '');
    const [bricolerBankCardName, setBricolerBankCardName] = useState(userData?.bricolerBankCardName || '');
    const [ribIBAN, setRibIBAN] = useState(userData?.ribIBAN || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
    const [errandsTransport, setErrandsTransport] = useState<string>(userData?.errandsTransport || '');
    const [movingTransport, setMovingTransport] = useState<string>(userData?.movingTransport || '');
    const [tourGuideAuthorizationFile, setTourGuideAuthorizationFile] = useState<File | Blob | null>(null);
    const [tourGuideAuthorizationUrl, setTourGuideAuthorizationUrl] = useState<string>(userData?.tourGuideAuthorizationUrl || '');

    // Activation code states
    const [hasCode, setHasCode] = useState<boolean | null>(null);
    const [activationCode, setActivationCode] = useState('');
    const [localUserData, setLocalUserData] = useState<any>(userData || null);

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
        if (mode === 'edit' || mode === 'add') {
            return [
                { id: 'services', label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) },
                { id: 'service_details', label: t({ en: 'Details', fr: 'Détails', ar: 'التفاصيل' }) },
                { id: 'finish', label: t({ en: 'Review', fr: 'Révision', ar: 'المراجعة' }) },
            ];
        }
        if (mode === 'admin_add' || mode === 'admin_edit') {
            return [
                { id: 'services', label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) },
                { id: 'service_details', label: t({ en: 'Details', fr: 'Détails', ar: 'التفاصيل' }) },
                { id: 'city', label: t({ en: 'City', fr: 'Ville', ar: 'المدينة' }) },
                { id: 'areas', label: t({ en: 'Work Areas', fr: 'Zones', ar: 'مناطق العمل' }) },
                { id: 'profile', label: t({ en: 'Bricoler Profile', fr: 'Profil Bricoleur', ar: 'ملف الحرفي' }) },
                { id: 'finish', label: t({ en: 'Save Bricoler', fr: 'Enregistrer', ar: 'حفظ' }) },
            ];
        }
        const baseSteps = [
            { id: 'activation', label: t({ en: 'Activation', fr: 'Activation', ar: 'تفعيل' }) },
            { id: 'services', label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) },
            { id: 'service_details', label: t({ en: 'Details', fr: 'Détails', ar: 'التفاصيل' }) },
            { id: 'city', label: t({ en: 'City', fr: 'Ville', ar: 'المدينة' }) },
            { id: 'areas', label: t({ en: 'Work Areas', fr: 'Zones', ar: 'مناطق العمل' }) },
            { id: 'profile', label: t({ en: 'Your Profile', fr: 'Profil', ar: 'ملفك الشخصي' }) },
            { id: 'finish', label: t({ en: 'Sign Up', fr: 'Inscription', ar: 'تسجيل' }) },
        ];

        return baseSteps;
    }, [t, mode, auth.currentUser, hasGoogleSigned]);

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

            if (userData.services && Array.isArray(userData.services)) {
                const subIds: string[] = [];
                const entries: Record<string, CategoryDetail> = {};

                userData.services.forEach((s: any) => {
                    const subId = typeof s === 'string' ? s : (s.subServiceId || s.id);
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
                const result = await signInWithPopup(auth, provider);
                user = result.user;
                // Wait for the Firebase auth token to propagate to Firestore.
                // On mobile/slow connections this can take 2-3 seconds.
                setSubmittingStatus("Setting up your account...");
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            if (!user) throw new Error("AUTH_FAILED");
            setSubmittingStatus("Preparing profile...");

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
            setSubmittingStatus("Saving profile...");
            const bricolerRef = doc(db, 'bricolers', user.uid);
            const isClaimingShadow = localUserData && localUserData.id && !localUserData.uid;

            // Retry Firestore reads up to 3 times with 2s backoff.
            // On mobile, the auth token may not yet be accepted by Firestore
            // immediately after signInWithPopup, causing permission-denied errors.
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
                        setSubmittingStatus(`Setting up account... (${attempt}/3)`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        throw readErr; // give up after 3 tries or non-permission errors
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
            const allPortfolioUrls = Array.from(new Set(finalCategoryEntries.flatMap((entry) => normalizeImageList(entry.portfolioImages))));

            const cleanObj = (obj: any) => {
                const newObj: any = {};
                Object.keys(obj).forEach(k => { if (obj[k] !== undefined) newObj[k] = obj[k]; });
                return newObj;
            };

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
                services: finalCategoryEntries,
                portfolio: allPortfolioUrls,
                images: allPortfolioUrls,
                experience: finalCategoryEntries[0]?.experience || "",
                city: selectedCity || "",
                workAreas: selectedAreas || [],
                updatedAt: serverTimestamp(),
                createdAt: existingBricoler?.createdAt || (isClaimingShadow ? localUserData.createdAt : null) || serverTimestamp(),
                isActive: true,
                isVerified: existingBricoler?.isVerified || (isClaimingShadow ? localUserData.isVerified : false) || false,
                rating: existingBricoler?.rating || (isClaimingShadow ? localUserData.rating : 5.0) || 5.0,
                completedJobs: existingBricoler?.completedJobs || (isClaimingShadow ? localUserData.completedJobs : 0) || 0,
                numReviews: existingBricoler?.numReviews || (isClaimingShadow ? localUserData.numReviews : 0) || 0,
                isBricoler: true,
                lastLoginAt: serverTimestamp(),
                tourGuideAuthorizationUrl: finalTourGuideUrl || null
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

            // ── Upload images synchronously with clear status messages ─────────────────
            // Background uploads kept failing (IMAGE_UPLOAD_TIMEOUT) because base64 data
            // was being garbage-collected or the promise died after component unmount.
            // We now upload BEFORE calling onComplete so images are guaranteed to save.

            let finalUploadedProfilePhotoUrl = finalProfilePhotoUrl;
            let finalUploadedCategoryEntries = finalCategoryEntries;
            let finalUploadedTourGuideUrl = finalTourGuideUrl;

            // Note: Media uploads are now disabled. The initial setDoc already saved all information.
            setSubmittingStatus("Complete!");
            onComplete({ services: finalUploadedCategoryEntries, city: selectedCity, availability });

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
                tourGuideAuthorizationUrl: finalTourGuideAuthUrl || existingData.tourGuideAuthorizationUrl
            };
            await setDoc(bricolerRef, updateData, { merge: true });
            await setDoc(doc(db, 'clients', user.uid), {
                isBricoler: true,
                userType: 'bricoler',
                photoURL: finalProfilePhotoUrl || updateData.photoURL || ""
            }, { merge: true });

            // Note: Media uploads are now disabled. The initial setDoc already saved all information.

            showToast({ title: t({ en: 'Successfully updated!', fr: 'Mis à jour avec succès !' }), variant: 'success' });
            onComplete({ services: finalCategoryEntries });
            onClose();
        } catch (error: any) {
            console.error("Update error:", error);
            showToast({ title: error.message || "Update failed", variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };
    const canGoNext = () => {
        if (step === 'activation') return hasCode === false || (hasCode === true && localUserData !== null);
        if (step === 'services') return selectedSubServices.length > 0;
        if (step === 'service_details') return currentEntryValid(currentCatEntry);
        if (step === 'city') return selectedCity !== '';
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

    const uploadDataUrlToStorage = async (path: string, dataUrl: string): Promise<string> => {
        const maxAttempts = 3;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            try {
                // Convert base64 data URL → Blob before uploading.
                // uploadBytes (binary) is ~33% faster than uploadString (base64-over-wire)
                // and avoids IMAGE_UPLOAD_TIMEOUT on slow connections.
                const blob = await dataUrlToBlob(dataUrl);
                const storageRef = ref(storage, path);
                const uploadRes = await withTimeout(
                    uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' }),
                    90000, // 90s timeout gives more headroom on slow connections
                    'IMAGE_UPLOAD'
                );
                return await withTimeout(getDownloadURL(uploadRes.ref), 20000, 'DOWNLOAD_URL');
            } catch (error) {
                if (attempt < maxAttempts && isRetryableStorageError(error)) {
                    try {
                        await auth.currentUser?.getIdToken(true);
                    } catch (tokenError) {
                        console.warn('Token refresh failed before upload retry:', tokenError);
                    }
                    await wait(2000 * attempt);
                    continue;
                }
                throw error;
            }
        }
        throw new Error('IMAGE_UPLOAD_FAILED');
    };

    const resolveServiceImagesForCategory = async (ownerId: string, categoryId: string, images: string[]): Promise<string[]> => {
        const normalized = normalizeImageList(images).slice(0, 6);
        const safeCategoryId = (categoryId || '').trim() || 'general';
        let attemptedUploads = 0;
        let successfulUploads = 0;
        const resolved = await Promise.all(
            normalized.map(async (image, i) => {
                if (!isImageDataUrl(image)) {
                    return image;
                }
                attemptedUploads += 1;
                try {
                    const path = `portfolio/${ownerId}/${safeCategoryId}/${Date.now()}_${i}.jpg`;
                    const url = await uploadDataUrlToStorage(path, image);
                    successfulUploads += 1;
                    return url;
                } catch (error) {
                    console.warn(`Skipping failed service image upload (${safeCategoryId} #${i + 1}):`, error);
                    return null;
                }
            })
        );

        // If they all fail, we just keep the base64 versions so they don't break the app
        // We remove the throw new Error('SERVICE_IMAGES_UPLOAD_FAILED_'...) so the background process finishes.
        if (attemptedUploads > 0 && successfulUploads === 0) {
            console.warn(`All service image uploads failed for category ${safeCategoryId}. Keeping local data URLs.`);
        }

        return Array.from(new Set(resolved.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)));
    };

    const resolveProfilePhoto = async (ownerId: string, value: string): Promise<string> => {
        if (!value) return '';
        if (!isImageDataUrl(value)) return value;
        const path = `avatars/${ownerId}/${Date.now()}_profile.jpg`;
        try {
            return await uploadDataUrlToStorage(path, value);
        } catch (e) {
            console.warn("Profile photo upload failed, retaining base64 data URL:", e);
            return value; // Fallback to base64 so we don't crash
        }
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
            const remainingSlots = Math.max(0, 6 - existing.length);
            if (remainingSlots === 0) {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Maximum reached', fr: 'Maximum atteint', ar: 'تم بلوغ الحد الأقصى' }),
                    description: t({ en: 'You can upload up to 6 photos per service.', fr: 'Vous pouvez téléverser jusqu’à 6 photos par service.', ar: 'يمكنك رفع 6 صور كحد أقصى لكل خدمة.' })
                });
                return;
            }

            const selected = Array.from(files).slice(0, remainingSlots);
            const compressedImages = await Promise.all(
                selected.map((file) => compressImageFileToDataUrl(file, {
                    maxWidth: 1600,
                    maxHeight: 1600,
                    quality: 0.72,
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
                maxWidth: 1000,
                maxHeight: 1000,
                quality: 0.78,
                mimeType: 'image/jpeg',
            });
            setProfilePhotoUrl(compressed);
        } catch (error) {
            console.error("Failed to process profile photo:", error);
            showToast({
                variant: 'error',
                title: t({ en: 'Upload failed', fr: 'Échec du téléversement', ar: 'فشل الرفع' }),
                description: t({ en: 'Could not process selected profile photo.', fr: 'Impossible de traiter la photo de profil sélectionnée.', ar: 'تعذر معالجة صورة الملف الشخصي المحددة.' })
            });
        } finally {
            setIsProcessingProfilePhoto(false);
        }
    };

    if (!isOpen) return null;

    const isLastCat = currentCatIdx === selectedCategoryIds.length - 1;
    const pitchLen = currentCatEntry?.pitch?.trim().length || 0;
    const currentProfileAvatar = profilePhotoUrl || userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || auth.currentUser?.photoURL || "/Images/Vectors Illu/LbricolFaceOY.webp";

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
                    className="fixed inset-0 bg-white z-[2000] flex flex-col"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="flex-1 flex flex-col h-full w-full max-w-[600px] mx-auto overflow-hidden bg-white"
                        onClick={e => e.stopPropagation()}
                    >
                        {isMobile && <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />}

                        {/* Header */}
                        {/* Header: Glovo Rider Style */}
                        <div className="flex items-center justify-between px-6 pt-8 pb-4 flex-shrink-0 relative">
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
                                className="w-10 h-10 flex items-center justify-center rounded-full text-[#00A082] hover:bg-[#E6F6F2] transition-colors"
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
                                    className="h-full bg-[#00A082]"
                                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full relative z-[1]" style={{ paddingBottom: '70px', scrollbarWidth: 'none' }}>
                            <AnimatePresence mode="wait" custom={direction}>
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
                                                        hasCode === true ? "border-[#00A082] bg-[#E6F6F2]" : "border-neutral-100 hover:border-neutral-200"
                                                    )}
                                                >
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", hasCode === true ? "bg-[#00A082] text-white" : "bg-neutral-50 text-neutral-400")}>
                                                        <Key size={24} />
                                                    </div>
                                                    <span className="font-bold text-neutral-900">{t({ en: 'Yes, I have one', fr: 'Oui, j\'en ai un', ar: 'نعم، لدي واحد' })}</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setHasCode(false);
                                                        setStepIndex(s => s + 1);
                                                    }}
                                                    className={cn(
                                                        "flex-1 p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3",
                                                        hasCode === false ? "border-[#00A082] bg-[#E6F6F2]" : "border-neutral-100 hover:border-neutral-200"
                                                    )}
                                                >
                                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", hasCode === false ? "bg-[#00A082] text-white" : "bg-neutral-50 text-neutral-400")}>
                                                        <ArrowRight size={24} />
                                                    </div>
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
                                                            className="w-full bg-white border-2 border-neutral-100 rounded-[20px] pl-12 pr-4 py-4 font-mono font-bold text-lg text-neutral-900 focus:border-[#00A082] outline-none transition-all placeholder:text-neutral-300"
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleVerifyCode}
                                                        disabled={!activationCode.trim() || isSubmitting}
                                                        className="w-full h-14 bg-[#00A082] text-white rounded-full font-black text-[15px] uppercase tracking-wider shadow-lg shadow-[#00A082]/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
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
                                                        {/* Icon organic loop (yellow behind when active) */}
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
                                                                backgroundColor: isActive ? '#FFC244' : hasSelected ? '#E6F6F2' : '#FFFFFF',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: (isActive || hasSelected) ? 'none' : '1.5px solid #F0F0F0',
                                                            }}
                                                            className="relative"
                                                        >
                                                            {hasSelected && (
                                                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#00A082] rounded-full flex items-center justify-center shadow-md z-20 border-2 border-white">
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
                                                            className="text-[14px] font-black whitespace-nowrap mt-1"
                                                            style={{
                                                                color: isActive || hasSelected ? '#00A082' : '#666',
                                                            }}
                                                        >
                                                            {t({ en: cat.name, fr: cat.name })}
                                                        </span>

                                                        {isActive && (
                                                            <motion.div
                                                                layoutId="category-indicator"
                                                                className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A082] rounded-full"
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
                                                                        ? "border-[#00A082] bg-[#00A082] text-white shadow-md"
                                                                        : "border-neutral-100 bg-white text-neutral-600 hover:border-neutral-300"
                                                                )}
                                                            >
                                                                {t({ en: sub.name, fr: sub.name })}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </motion.div>
                                            </AnimatePresence>
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
                                                                idx === currentCatIdx ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : done ? 'bg-[#00A082]/5 text-[#00A082]/60 border-neutral-100' : 'bg-white text-neutral-400 border-neutral-100'
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
                                                    <p className="text-[#00A082] text-xs font-black tracking-widest uppercase">{t({ en: 'Service Category', fr: 'Catégorie de service', ar: 'فئة الخدمة' })}</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* 1. Experience */}
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                            <label className="text-[20px] font-bold text-neutral-900 flex items-center gap-2">
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
                                                            currentCatEntry.experience === val.en ? "bg-[#E6F6F2] text-[#00A082] border-[#00A082]" : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200"
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
                                                                    ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]'
                                                                    : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                            )}
                                                        >
                                                            {t(opt.label)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* 1.6 — Moving help: What vehicle do you use? */}
                                        {currentCatId === 'moving' && currentCatEntry.experience !== '' && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                                <label className="text-[20px] font-bold text-neutral-900 block">
                                                    {t({
                                                        en: 'What vehicle do you use for moving jobs?',
                                                        fr: 'Quel véhicule utilisez-vous pour les missions de déménagement ?',
                                                        ar: 'ما هي وسيلة النقل التي تستعملها في مهام النقل؟'
                                                    })}
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'truck', label: { en: '🚚 Moving truck', fr: '🚚 Camion de déménagement', ar: '🚚 شاحنة للنقل' } },
                                                        { id: 'van', label: { en: '🚐 Van', fr: '🚐 Camionnette', ar: '🚐 سيارة "فان"' } },
                                                        { id: 'car', label: { en: '🚗 Car', fr: '🚗 Voiture', ar: '🚗 سيارة' } },
                                                        { id: 'labor_only', label: { en: '💪 Labor only (no vehicle)', fr: '💪 Main-d’œuvre uniquement (sans véhicule)', ar: '💪 يد عاملة فقط (بدون وسيلة نقل)' } },
                                                        { id: 'other', label: { en: 'Other setup', fr: 'Autre configuration', ar: 'ترتيب آخر' } },
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setMovingTransport(opt.id)}
                                                            className={cn(
                                                                'px-3 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all text-left',
                                                                movingTransport === opt.id
                                                                    ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]'
                                                                    : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                            )}
                                                        >
                                                            {t(opt.label)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* 2. Equipment */}
                                        <AnimatePresence>
                                            {currentCatEntry.experience !== '' && !NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId) && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        {currentCatEntry.categoryId !== 'tour_guide' && (
                                                            <label className="text-[20px] font-bold text-neutral-900 flex items-center gap-2">
                                                                {t({ en: 'Which Equipment do you have?', fr: 'Quel équipement avez-vous ?', ar: 'ما هي المعدات التي تمتلكها؟' })}
                                                            </label>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4">
                                                        {currentCatEntry.categoryId !== 'tour_guide' && (
                                                            <>
                                                                <div className="flex flex-wrap gap-2.5">
                                                                    {/* "I don't have tools" as first option */}
                                                                    <button
                                                                        onClick={() => {
                                                                            const newValue = !currentCatEntry.noEquipment;
                                                                            updateCatEntry(currentCatId, 'noEquipment', newValue);
                                                                            if (newValue) updateCatEntry(currentCatId, 'equipments', []);
                                                                        }}
                                                                        className={cn(
                                                                            "px-5 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all flex items-center justify-center gap-2 min-w-[120px] lg:min-w-0",
                                                                            currentCatEntry.noEquipment
                                                                                ? "bg-[#00A082] border-[#00A082] text-white"
                                                                                : "bg-white text-neutral-800 border-neutral-200 hover:border-[#008C74]/30"
                                                                        )}
                                                                    >
                                                                        {currentCatEntry.noEquipment && <Check size={16} strokeWidth={3} />}
                                                                        {t({ en: "I don't have tools", fr: "Je n'ai pas d'outils", ar: 'ليس لدي أدوات' })}
                                                                    </button>

                                                                    {(SERVICE_EQUIPMENT_SUGGESTIONS[currentCatEntry.categoryId] || []).map(eq => {
                                                                        const isAdded = currentCatEntry.equipments.includes(eq);
                                                                        return (
                                                                            <button
                                                                                key={eq}
                                                                                onClick={() => {
                                                                                    if (isAdded) {
                                                                                        removeEquipment(currentCatId, eq);
                                                                                    } else {
                                                                                        addEquipment(currentCatId, eq);
                                                                                        // If adding a tool, turn off "noEquipment"
                                                                                        updateCatEntry(currentCatId, 'noEquipment', false);
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    "px-5 py-4 rounded-[12px] border-2 text-[14px] font-bold transition-all flex items-center justify-center gap-2 min-w-[120px] lg:min-w-0",
                                                                                    isAdded ? "bg-[#E6F6F2] border-[#00A082] text-[#00A082]" : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200"
                                                                                )}
                                                                            >
                                                                                {isAdded && <Check size={16} strokeWidth={3} />}{t({ en: eq, fr: eq })}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <div className="flex items-center gap-2 bg-white border-2 border-neutral-100 rounded-[22px] pl-5 pr-2 py-2 focus-within:border-[#00A082] transition-colors">
                                                                    <input type="text" placeholder={t({ en: 'Add other equipment...', fr: 'Ajouter un autre équipement...', ar: 'إضافة معدات أخرى...' })} value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && equipmentSearch.trim()) { e.preventDefault(); addEquipment(currentCatId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="flex-1 bg-transparent outline-none text-[15px] font-medium text-neutral-900 placeholder:text-neutral-400" />
                                                                    <button onClick={() => { if (equipmentSearch.trim()) { addEquipment(currentCatId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="px-5 py-3 bg-[#00A082] text-white rounded-[18px] text-[13px] font-black hover:bg-[#008C74] active:scale-95 transition-all">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })}</button>
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
                                                                        ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]'
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
                                            {(currentCatEntry.noEquipment || currentCatEntry.equipments.length > 0 || NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId)) && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[17px] font-black text-neutral-900 flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">3</div>
                                                            {currentCatId === 'errands'
                                                                ? t({
                                                                    en: "What's the minimum price you accept for a simple delivery task?",
                                                                    fr: "Quel est le prix minimum que vous acceptez pour une simple mission de livraison ?",
                                                                    ar: "ما هو أقل ثمن تقبله مقابل مهمة توصيل بسيطة؟"
                                                                })
                                                                : t({
                                                                    en: "What's the minimum price you accept for this service?",
                                                                    fr: "Quel est le prix minimum que vous acceptez pour ce service ?",
                                                                    ar: "ما هو أقل ثمن تقبله مقابل هذه الخدمة؟"
                                                                })}
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
                                                                className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#00A082] transition-all text-neutral-400 hover:text-[#00A082]"
                                                            >
                                                                <Minus size={24} strokeWidth={3} />
                                                            </button>
                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-baseline gap-1 whitespace-nowrap">
                                                                    <span className="text-5xl font-black text-neutral-900 tracking-tighter leading-none">{currentCatEntry?.hourlyRate || 75}</span>
                                                                    <span className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'MIN PRICE (MAD)', fr: 'PRIX MIN (MAD)', ar: 'أقل ثمن (درهم)' })}</span>
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
                                                                className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#00A082] transition-all text-neutral-400 hover:text-[#00A082]"
                                                            >
                                                                <Plus size={24} strokeWidth={3} />
                                                            </button>
                                                        </div>

                                                        {tierInfo && (tierInfo.suggestedMin > 0) && (
                                                            <div className="mt-8 pt-8 border-t border-neutral-100 w-full">
                                                                <div className="flex items-center justify-between mb-5 px-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-xl bg-[#FFC244]/20 flex items-center justify-center">
                                                                            <TrendingUp size={16} className="text-[#FF9500]" />
                                                                        </div>
                                                                        <h4 className="text-[15px] font-[1000] text-black uppercase tracking-tight">
                                                                            {t({ en: 'Market Reference (MAD)', fr: 'Référence Marché (MAD)', ar: 'مرجع السوق (درهم)' })}
                                                                        </h4>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-neutral-100/50 rounded-[32px] p-2">
                                                                    <div className="flex w-full overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
                                                                        <div className="flex gap-3 min-w-full">
                                                                            {[
                                                                                { rate: tierInfo.suggestedMin, label: t({ en: 'Standard', fr: 'Standard', ar: 'أساسي' }), color: 'text-[#00A082]', bg: 'bg-[#E6F6F2]', icon: User },
                                                                                { rate: Math.round((tierInfo.suggestedMin + tierInfo.suggestedMax) / 2), label: t({ en: 'Average', fr: 'Moyen', ar: 'متوسط' }), color: 'text-[#007AFF]', bg: 'bg-[#E6F0FF]', icon: TrendingUp },
                                                                                { rate: tierInfo.suggestedMax, label: t({ en: 'Premium', fr: 'Premium', ar: 'ممتاز' }), color: 'text-[#FF9500]', bg: 'bg-[#FFF5E6]', icon: Star }
                                                                            ].map((mock, idx) => {
                                                                                const isSelected = currentCatEntry?.hourlyRate === mock.rate;
                                                                                return (
                                                                                    <motion.div
                                                                                        key={idx}
                                                                                        whileTap={{ scale: 0.95 }}
                                                                                        onClick={() => updateCatEntry(currentCatId, 'hourlyRate', mock.rate)}
                                                                                        className={cn(
                                                                                            "flex-1 min-w-[125px] bg-white border-2 rounded-[24px] p-5 flex flex-col items-center gap-4 transition-all cursor-pointer relative",
                                                                                            isSelected
                                                                                                ? "border-[#00A082] shadow-lg shadow-[#00A082]/10 -translate-y-1"
                                                                                                : "border-transparent hover:border-neutral-200 shadow-sm"
                                                                                        )}
                                                                                    >
                                                                                        {isSelected && (
                                                                                            <div className="absolute -top-2.5 left-1/2 -track-x-1/2 bg-[#00A082] text-white text-[9px] font-[1000] px-2.5 py-1 rounded-full uppercase tracking-widest whitespace-nowrap shadow-md z-10" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                                                                                                {t({ en: 'Selected', fr: 'Choisi', ar: 'مختار' })}
                                                                                            </div>
                                                                                        )}
                                                                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", mock.bg, mock.color)}>
                                                                                            <mock.icon size={20} strokeWidth={2.5} />
                                                                                        </div>
                                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                                            <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] opacity-80", mock.color)}>
                                                                                                {mock.label}
                                                                                            </span>
                                                                                            <div className="flex items-baseline gap-0.5">
                                                                                                <span className="text-[22px] font-black text-black leading-none">
                                                                                                    {mock.rate}
                                                                                                </span>
                                                                                                <span className="text-[10px] font-black text-neutral-300">MAD</span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Tiny 'Suggested' tag for the Average one */}
                                                                                        {mock.label === t({ en: 'Average', fr: 'Moyen', ar: 'متوسط' }) && (
                                                                                            <div className="mt-1 px-2 py-0.5 bg-neutral-50 rounded-md border border-neutral-100">
                                                                                                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">{t({ en: 'Ideal', fr: 'Idéal' })}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </motion.div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* 4. Experience Description — only shows after equipment is done */}
                                        <AnimatePresence>
                                            {(currentCatEntry.noEquipment || currentCatEntry.equipments.length > 0 || NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId)) && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[16px] font-black text-neutral-900 flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">4</div>
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
                                                                (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "border-[#008C74] bg-[#E6F6F2]/30" : "border-neutral-100 focus:border-[#00A082]"
                                                            )}
                                                        />
                                                        <div className="flex items-center gap-4 px-2">
                                                            <div className="flex-1 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn("h-full transition-all duration-300 rounded-full", (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "bg-[#00A082]" : "bg-[#00A082]/50")}
                                                                    style={{ width: `${Math.min(100, ((currentCatEntry?.pitch?.length || 0) / MIN_PITCH_CHARS) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={cn("text-[13px] font-black whitespace-nowrap", (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "text-[#00A082]" : "text-neutral-400")}>
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

                                {/* ── STEP: City ── */}
                                {step === 'city' && (
                                    <motion.div key="city" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Your City', fr: 'Votre Ville', ar: 'مدينتك' })}</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Tap a city to continue automatically.', fr: 'Appuyez sur une ville pour continuer automatiquement.', ar: 'اضغط على مدينة للمتابعة تلقائياً.' })}</p>
                                        </motion.div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                            {MOROCCAN_CITIES.map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => {
                                                        setSelectedCity(city);
                                                        setSelectedAreas([]);
                                                        // Auto-advance to Service Areas step
                                                        setDirection(1);
                                                        setTimeout(() => setStepIndex(s => s + 1), 300);
                                                    }}
                                                    className={cn(
                                                        'px-5 py-8 rounded-[12px] border-2 text-[15px] font-bold transition-all',
                                                        selectedCity === city ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : 'bg-white text-neutral-900 border-neutral-100 hover:border-neutral-200'
                                                    )}
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Work Areas ── */}
                                {step === 'areas' && (
                                    <motion.div key="areas" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Service Areas You can serve in city', fr: 'Quartiers que vous pouvez desservir dans la ville', ar: 'مناطق الخدمة التي يمكنك تغطيتها في المدينة' })}</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Select the neighborhoods you cover.', fr: 'Sélectionnez les quartiers que vous couvrez.', ar: 'اختر الأحياء التي تغطيها.' })}</p>
                                        </motion.div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex items-center gap-3 bg-white border-2 border-neutral-100 rounded-[12px] px-6 py-5 focus-within:border-[#00A082] transition-all">
                                            <Search size={24} className="text-neutral-400" />
                                            <input type="text" placeholder={t({ en: 'Search neighborhood...', fr: 'Rechercher un quartier...', ar: 'البحث عن حي...' })} value={areaSearch} onChange={e => setAreaSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-[17px] font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-medium" />
                                        </motion.div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                            {/* All the city button */}
                                            <button
                                                onClick={() => {
                                                    const allAreas = (selectedCity && MOROCCAN_CITIES_AREAS[selectedCity]) || [];
                                                    setSelectedAreas(prev => {
                                                        const current = Array.isArray(prev) ? prev : [];
                                                        return current.length === allAreas.length ? [] : [...allAreas];
                                                    });
                                                }}
                                                className={cn(
                                                    'col-span-2 flex items-center justify-center gap-2 px-5 py-5 rounded-[12px] border-2 text-[14px] font-bold transition-all mb-2',
                                                    Array.isArray(selectedAreas) && selectedAreas.length === ((selectedCity && MOROCCAN_CITIES_AREAS[selectedCity]) || []).length && ((selectedCity && MOROCCAN_CITIES_AREAS[selectedCity]) || []).length > 0
                                                        ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]'
                                                        : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                )}
                                            >
                                                {Array.isArray(selectedAreas) && selectedAreas.length === ((selectedCity && MOROCCAN_CITIES_AREAS[selectedCity]) || []).length && ((selectedCity && MOROCCAN_CITIES_AREAS[selectedCity]) || []).length > 0 && <Check size={16} strokeWidth={4} />}
                                                {t({ en: 'All the city', fr: 'Toute la ville', ar: 'كل المدينة' })}
                                            </button>
                                            {/* Option to add custom area if search doesn't match exactly */}
                                            {areaSearch.trim() && !filteredAreas.some(a => a.toLowerCase() === areaSearch.trim().toLowerCase()) && (
                                                <button
                                                    onClick={() => {
                                                        const newArea = areaSearch.trim();
                                                        if (!selectedAreas.includes(newArea)) {
                                                            setSelectedAreas(prev => [...prev, newArea]);
                                                        }
                                                        setAreaSearch('');
                                                    }}
                                                    className="col-span-2 flex items-center justify-center gap-2 px-5 py-5 rounded-[12px] border-2 border-dashed border-[#00A082] text-[14px] font-bold text-[#00A082] bg-[#E6F6F2]/30 hover:bg-[#E6F6F2]/50 transition-all mb-2"
                                                >
                                                    <Plus size={18} />
                                                    {t({ en: `Add "${areaSearch}"`, fr: `Ajouter "${areaSearch}"`, ar: `إضافة "${areaSearch}"` })}
                                                </button>
                                            )}

                                            {filteredAreas.map(area => {
                                                const currentAreas = Array.isArray(selectedAreas) ? selectedAreas : [];
                                                const sel = currentAreas.includes(area);
                                                return (
                                                    <button
                                                        key={area}
                                                        onClick={() => setSelectedAreas(prev => {
                                                            const current = Array.isArray(prev) ? prev : [];
                                                            return sel ? current.filter(x => x !== area) : [...current, area];
                                                        })}
                                                        className={cn(
                                                            'flex items-center justify-center gap-2 px-5 py-5 rounded-[12px] border-2 text-[14px] font-bold transition-all',
                                                            sel ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                        )}
                                                    >
                                                        {sel && <Check size={16} strokeWidth={4} />}{t({ en: area, fr: area })}
                                                    </button>
                                                );
                                            })}

                                            {/* Display selected custom areas that might have been filtered out of the suggestions */}
                                            {selectedAreas.filter(a => !filteredAreas.includes(a) && (areaSearch ? a.toLowerCase().includes(areaSearch.toLowerCase()) : true)).map(area => (
                                                <button
                                                    key={area}
                                                    onClick={() => setSelectedAreas(prev => prev.filter(x => x !== area))}
                                                    className="flex items-center justify-center gap-2 px-5 py-5 rounded-[12px] border-2 bg-[#E6F6F2] text-[#00A082] border-[#00A082] text-[14px] font-bold transition-all"
                                                >
                                                    <Check size={16} strokeWidth={4} />{area}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* ── STEP: Profile ── */}
                                {step === 'profile' && (
                                    <motion.div key="profile" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-10">
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1 text-center">
                                            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Your Profile', fr: 'Votre profil', ar: 'ملفك الشخصي' })}</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'This is how clients see you.', fr: 'Voici comment les clients vous voient.', ar: 'هكذا يراك العملاء.' })}</p>
                                        </motion.div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex flex-col items-center gap-4">
                                            <div className="w-32 h-32 rounded-full bg-neutral-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                                                <img src={currentProfileAvatar} alt="Profile" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="px-6 py-3 rounded-2xl bg-[#00A082]/5 border border-[#00A082]/10 flex flex-col items-center gap-2">
                                                <div className="flex items-center gap-2 text-[#00A082] font-black text-[14px]">
                                                    <CheckCircle2 size={16} />
                                                    {t({ en: 'Photo Synced via Google', fr: 'Photo synchronisée via Google', ar: 'تمت مزامنة الصورة عبر Google' })}
                                                </div>
                                            </div>
                                            <p className="text-[12px] text-neutral-400 text-center max-w-[280px]">
                                                {t({
                                                    en: 'Your profile photo is automatically updated from your Google account. Direct uploads are currently disabled.',
                                                    fr: 'Votre photo de profil est automatiquement mise à jour depuis votre compte Google. Les téléchargements directs sont actuellement désactivés.',
                                                    ar: 'يتم تحديث صورة ملفك الشخصي تلقائيًا من حساب Google الخاص بك. الرفع المباشر غير مفعل حاليًا.'
                                                })}
                                            </p>
                                        </motion.div>
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Full Name', fr: 'Nom complet', ar: 'الاسم الكامل' })}</label>
                                                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t({ en: 'Your full name', fr: 'Votre nom complet', ar: 'اسمك الكامل' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'WhatsApp Number', fr: 'Numéro WhatsApp', ar: 'رقم الواتساب' })}</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="px-5 py-4 bg-neutral-100 rounded-[12px] text-[16px] font-bold text-neutral-600">+212</div>
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
                                                        className="flex-1 px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400"
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
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="bg-[#E6F6F2] rounded-[16px] p-8 space-y-6 border-2 border-[#00A082]/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#00A082]/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-[12px] border-2 border-white overflow-hidden bg-white shadow-sm">
                                                    <img src={currentProfileAvatar} alt="Profile" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#00A082]">{t({ en: 'Verified Pro', fr: 'Pro vérifié', ar: 'محترف موثق' })}</h3>
                                                        <div className="w-4 h-4 bg-[#FFC244] rounded-full flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={5} /></div>
                                                    </div>
                                                    <p className="text-[24px] font-black text-neutral-900 tracking-tight leading-tight">{fullName}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-neutral-600 font-bold text-[15px] bg-white/50 backdrop-blur-sm px-4 py-2 rounded-[8px] w-fit">
                                                    <MapPin size={18} className="text-[#0CB380]" />
                                                    {mode === 'onboarding' ? selectedCity : (userData?.city || selectedCity)}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedSubServices.map(id => {
                                                        const svc = ALL_SERVICES.find(s => s.subServices.some(ss => ss.id === id) || s.id === id);
                                                        const entry = categoryEntries[svc?.id || ''];
                                                        const subServiceName = svc?.subServices?.find(ss => ss.id === id)?.name || id;
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
                                                                {t({ en: subServiceName, fr: subServiceName })} · {entry?.hourlyRate} {t({ en: 'MAD', fr: 'MAD', ar: 'درهم' })}
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
                                                className="w-full h-[64px] bg-[#0CB380] hover:bg-[#008C74] text-white rounded-[16px] text-[18px] font-bold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-60"
                                            >
                                                {isSubmitting ? (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-5 h-5 border-[3px] border-white/40 border-t-white rounded-full animate-spin" />
                                                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                                                            {submittingStatus && t({ en: submittingStatus, fr: submittingStatus })}
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

                                            {!isSubmitting && (
                                                <button
                                                    onClick={onClose}
                                                    className="w-full py-4 text-neutral-400 font-bold hover:text-red-500 transition-colors"
                                                >
                                                    {t({ en: 'Discard Changes', fr: 'Ignorer les modifications', ar: 'تجاهل التعديلات' })}
                                                </button>
                                            )}

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
                            step !== 'finish' && step !== 'google_signin' && (
                                <div className="p-4 md:p-6 pb-6 md:pb-8 bg-white border-t border-neutral-100 flex-shrink-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={goNext}
                                        disabled={!canGoNext()}
                                        className="w-full h-16 bg-[#00A082] text-white rounded-[16px] text-[18px] font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
