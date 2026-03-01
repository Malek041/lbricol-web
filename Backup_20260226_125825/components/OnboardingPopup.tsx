"use client";

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, Search, ChevronLeft, ChevronRight, Upload, Info, Plus, Minus, Camera, MapPin, ArrowRight, TrendingUp, User, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaGoogle } from 'react-icons/fa6';
import { getAllServices, getServiceVector, type ServiceConfig } from '@/config/services_config';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS, SERVICE_TIER_RATES } from '@/config/moroccan_areas';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';

interface OnboardingPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: {
        services: any[];
        city: string;
        availability?: Record<string, { from: string; to: string }[]>;
        createdAt?: Timestamp | any;
    }) => void;
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
};

// Services where equipment is not typically applicable (offer "No Equipment" by default label)
const NO_EQUIPMENT_SERVICES = ['babysitting', 'elderly_assistance', 'errands', 'driver'];

const OnboardingPopup = ({ isOpen, onClose, onComplete }: OnboardingPopupProps) => {
    const { showToast } = useToast();
    const { t } = useLanguage();
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ── Data ────────────────────────────────────────────────────────────────
    const [selectedSubServices, setSelectedSubServices] = useState<string[]>([]);
    const [categoryEntries, setCategoryEntries] = useState<Record<string, CategoryDetail>>({});
    const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_SERVICES[0]?.id || '');
    const [currentCatIdx, setCurrentCatIdx] = useState(0);
    const [equipmentSearch, setEquipmentSearch] = useState('');

    const [selectedCity, setSelectedCity] = useState('');
    const [areaSearch, setAreaSearch] = useState('');
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

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

    const [fullName, setFullName] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

    // Optional bank details
    const [bankName, setBankName] = useState('');
    const [bricolerBankCardName, setBricolerBankCardName] = useState('');
    const [ribIBAN, setRibIBAN] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);

    // ── Steps (no Availability — bricoler sets it in their dashboard) ────────
    const STEPS = useMemo(() => [
        { id: 'services', label: t({ en: 'Services', fr: 'Services' }) },
        { id: 'service_details', label: t({ en: 'Details', fr: 'Détails' }) },
        { id: 'city', label: t({ en: 'City', fr: 'Ville' }) },
        { id: 'areas', label: t({ en: 'Work Areas', fr: 'Zones' }) },
        { id: 'profile', label: t({ en: 'Your Profile', fr: 'Profil' }) },
        { id: 'finish', label: t({ en: 'Sign Up', fr: 'Inscription' }) },
    ], [t]);

    const [stepIndex, setStepIndex] = useState(0);
    const step = STEPS[stepIndex]?.id || 'services';
    const totalSteps = STEPS.length;

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
        return (
            entry.experience !== '' &&
            (entry.noEquipment || entry.equipments.length > 0) &&
            entry.hourlyRate > 0 &&
            entry.pitch.trim().length >= MIN_PITCH_CHARS
        );
    };

    const canGoNext = () => {
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
    const toggleSubService = (catId: string, subSvcId: string, subSvcName: string) => {
        setSelectedSubServices(prev => {
            if (prev.includes(subSvcId)) {
                return prev.filter(s => s !== subSvcId);
            } else {
                const tier = SERVICE_TIER_RATES[catId];
                const cat = ALL_SERVICES.find(s => s.id === catId);
                setCategoryEntries(e => ({
                    ...e,
                    [catId]: e[catId] || {
                        categoryId: catId,
                        categoryName: cat?.name || catId,
                        hourlyRate: tier?.suggestedMin || 100,
                        pitch: '',
                        experience: '',
                        equipments: [],
                        noEquipment: NO_EQUIPMENT_SERVICES.includes(catId),
                        portfolioImages: [],
                    }
                }));
                return [...prev, subSvcId];
            }
        });
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

    // ── Profile image ────────────────────────────────────────────────────────
    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setProfileImageFile(file);
        const reader = new FileReader();
        reader.onload = ev => setProfileImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Image Compression ───────────────────────────────────────────────────
    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 800;
                    if (width > height) {
                        if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
                    } else {
                        if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas toBlob failed'));
                    }, 'image/jpeg', 0.7);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleGoogleSignup = async () => {
        const provider = new GoogleAuthProvider();
        setIsSubmitting(true);
        setSubmittingStatus("Authenticating...");

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            setSubmittingStatus("Preparing profile...");

            // Use only uploaded photo — never fall back to Google's photoURL
            // Use uploaded photo, fallback to Google's photoURL if no new upload
            let finalAvatarUrl = user.photoURL || '';
            if (profileImageFile) {
                setSubmittingStatus("Uploading photo...");
                try {
                    const compressedBlob = await compressImage(profileImageFile);
                    const uploadPromise = (async () => {
                        const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_profile.jpg`);
                        const uploadResult = await uploadBytes(storageRef, compressedBlob);
                        return await getDownloadURL(uploadResult.ref);
                    })();
                    const timeoutPromise = new Promise<string>((_, reject) =>
                        setTimeout(() => reject(new Error("Upload timeout")), 30000)
                    );
                    const uploadedUrl = await Promise.race([uploadPromise, timeoutPromise]);
                    finalAvatarUrl = uploadedUrl;

                    // Update Auth profile so user.photoURL is also updated
                    try {
                        await updateProfile(user, { photoURL: finalAvatarUrl });
                    } catch (authErr) {
                        console.warn("Auth profile update skipped", authErr);
                    }
                } catch (uploadError: any) {
                    console.warn("Photo upload skipped/failed:", uploadError.message);
                    setSubmittingStatus("Proceeding...");
                    // Keep finalAvatarUrl as user.photoURL if upload failed
                }
            }

            setSubmittingStatus("Creating account...");
            const entries = selectedSubServices.map(subId => {
                const svc = ALL_SERVICES.find(s => s.subServices.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: ALL_SERVICES.find(s => s.id === catId)?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 100,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: e?.portfolioImages || [],
                };
            });

            const bricolerRef = doc(db, 'bricolers', user.uid);
            const bricolerSnap = await getDoc(bricolerRef);
            const existingData = bricolerSnap.exists() ? bricolerSnap.data() : null;

            // Aggregate all portfolio images from all categories
            const allPortfolioImages = Object.values(categoryEntries).flatMap(e => e.portfolioImages || []);

            const bricolerData = {
                uid: user.uid,
                displayName: (fullName || user.displayName || "Bricoler").trim(),
                name: (fullName || user.displayName || "Bricoler").trim(),
                email: user.email || "",
                avatar: finalAvatarUrl || user.photoURL || "",
                photoURL: finalAvatarUrl || user.photoURL || "",
                nidNumber: '',
                whatsappNumber: (whatsappNumber || '').trim(),
                bankName: bankName.trim(),
                bricolerBankCardName: bricolerBankCardName.trim(),
                ribIBAN: ribIBAN.trim(),
                services: entries,
                portfolio: allPortfolioImages, // Aggregate for general profile view
                experience: entries[0]?.experience || "",
                glassCleaningEquipments: entries.filter(e => e.categoryId === 'glass_cleaning').flatMap(e => e.equipments),
                city: selectedCity || "",
                workAreas: selectedAreas || [],
                isBricoler: true,
                isActive: true,
                calendarSlots: existingData?.calendarSlots || [],
                rating: existingData?.rating || 0,
                completedJobs: existingData?.completedJobs || 0,
                stats: existingData?.stats || { rating: 0, completedJobs: 0, clientHistory: [] },
                createdAt: existingData?.createdAt || serverTimestamp(),
                lastLoginAt: serverTimestamp()
            };

            await setDoc(bricolerRef, bricolerData, { merge: true });

            const clientRef = doc(db, 'clients', user.uid);
            await setDoc(clientRef, {
                uid: user.uid,
                name: bricolerData.name,
                email: bricolerData.email,
                photoURL: finalAvatarUrl || user.photoURL || "",
                whatsappNumber: bricolerData.whatsappNumber,
                createdAt: existingData?.createdAt || serverTimestamp(),
                isBricoler: true
            }, { merge: true });


            // Update city_services
            setSubmittingStatus("Finalizing city stats...");
            const cityRef = doc(db, 'city_services', selectedCity);
            const citySnap = await getDoc(cityRef);
            const serviceIds = [...new Set(entries.map(e => e.categoryId))];
            const subServiceIds = entries.map(e => e.subServiceId);
            if (!citySnap.exists()) {
                await setDoc(cityRef, { active_services: serviceIds, active_sub_services: subServiceIds, work_areas: selectedAreas, total_pros: 1, lastUpdated: serverTimestamp() });
            } else {
                const existingCityData = citySnap.data();
                const updatedServices = [...new Set([...(existingCityData.active_services || []), ...serviceIds])];
                const updatedSubServices = [...new Set([...(existingCityData.active_sub_services || []), ...subServiceIds])];
                const updatedAreas = [...new Set([...(existingCityData.work_areas || []), ...selectedAreas])];
                await updateDoc(cityRef, { active_services: updatedServices, active_sub_services: updatedSubServices, work_areas: updatedAreas, total_pros: (existingCityData.total_pros || 0) + 1, lastUpdated: serverTimestamp() });
            }

            setSubmittingStatus("Redirecting...");
            onComplete({ services: entries, city: selectedCity, availability });
        } catch (error: any) {
            console.error('Signup error:', error);
            let errorMessage = 'An error occurred during signup.';
            if (error.code === 'auth/popup-blocked') errorMessage = 'Login popup was blocked by your browser.';
            else if (error.code === 'permission-denied') errorMessage = 'Permission denied. Please check Firestore rules.';
            showToast({ variant: 'error', title: 'Sign-up failed', description: errorMessage });
            setSubmittingStatus(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isLastCat = currentCatIdx === selectedCategoryIds.length - 1;
    const pitchLen = currentCatEntry?.pitch?.trim().length || 0;

    return (
        <AnimatePresence>
            <motion.div
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
                            {step === 'services' ? 'Start working' :
                                step === 'profile' ? 'Your Profile' :
                                    step === 'availability' ? 'Availability' :
                                        'Onboarding'}
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
                    <div className="flex-1 overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
                        <AnimatePresence mode="wait" custom={direction}>

                            {/* ── STEP: Services ── */}
                            {step === 'services' && (
                                <motion.div key="services" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="p-6 md:p-10 space-y-8">
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Your Services', fr: 'Vos Services' })}</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Pick one or more categories.', fr: 'Choisissez une ou plusieurs catégories.' })}</p>
                                    </motion.div>

                                    {/* Category Selectors (Top Horizontal) */}
                                    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-2 px-2" style={{ scrollbarWidth: 'none' }}>
                                        {ALL_SERVICES.map(cat => {
                                            const isActive = activeCategoryId === cat.id;
                                            const hasSelected = selectedSubServices.some(subId => cat.subServices.some(s => s.id === subId));
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setActiveCategoryId(cat.id)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-3 shrink-0 min-w-[110px] h-[110px] rounded-[16px] border-2 transition-all relative",
                                                        isActive ? "bg-[#E6F6F2] border-[#00A082]" : hasSelected ? "bg-[#E6F6F2]/40 border-[#00A082]/40" : "bg-white border-neutral-100"
                                                    )}
                                                >
                                                    {/* Green checkmark on previously-selected categories */}
                                                    {hasSelected && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#00A082] rounded-full flex items-center justify-center shadow-sm">
                                                            <Check size={11} strokeWidth={4} className="text-white" />
                                                        </div>
                                                    )}
                                                    {/* All images ungreyed — only active gets full colour highlight */}
                                                    <img
                                                        src={getServiceVector(cat.id)}
                                                        className="w-12 h-12 object-contain"
                                                        alt={cat.name}
                                                    />
                                                    <span className={cn(
                                                        "text-[13px] tracking-tight transition-colors px-2 text-center leading-tight",
                                                        isActive || hasSelected ? "text-[#00A082] font-black" : "text-neutral-900 font-bold"
                                                    )}>
                                                        {cat.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Sub-category Chips */}
                                    <div className="space-y-4 pt-4 overflow-hidden min-h-[160px]">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={activeCategoryId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex flex-wrap gap-2.5"
                                            >
                                                {ALL_SERVICES.find(c => c.id === activeCategoryId)?.subServices.map((sub) => {
                                                    const isSelected = selectedSubServices.includes(sub.id);
                                                    return (
                                                        <motion.button
                                                            key={sub.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => toggleSubService(activeCategoryId, sub.id, sub.name)}
                                                            className={cn(
                                                                "flex items-center justify-center min-w-[140px] min-h-[100px] px-4 py-3 rounded-[12px] border-2 text-[15px] font-black transition-all text-center leading-tight break-words",
                                                                isSelected
                                                                    ? "bg-[#E6F6F2] border-[#00A082] text-[#00A082]"
                                                                    : "bg-white border-neutral-100 text-neutral-900 hover:border-neutral-200"
                                                            )}
                                                        >
                                                            {sub.name}
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
                                                    <button
                                                        key={id}
                                                        onClick={() => { setDirection(idx > currentCatIdx ? 1 : -1); setCurrentCatIdx(idx); setEquipmentSearch(''); }}
                                                        className={cn(
                                                            'flex items-center gap-2 px-6 py-3 rounded-[12px] text-[13px] font-bold whitespace-nowrap border-2 transition-all',
                                                            idx === currentCatIdx ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : done ? 'bg-[#00A082]/5 text-[#00A082]/60 border-neutral-100' : 'bg-white text-neutral-400 border-neutral-100'
                                                        )}
                                                    >
                                                        {done && <Check size={12} strokeWidth={4} />}
                                                        {s?.categoryName || id}
                                                    </button>
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
                                                <h2 className="text-3xl font-black text-neutral-900 leading-tight">{currentCatEntry.categoryName}</h2>
                                                <p className="text-[#00A082] text-xs font-black tracking-widest uppercase">Service Category</p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* 1. Experience */}
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                        <label className="text-[20px] font-bold text-neutral-900 flex items-center gap-2">
                                            {t({ en: `How many years of experience do you have in ${currentCatEntry.categoryName}?`, fr: `Combien d'années d'expérience avez-vous en ${currentCatEntry.categoryName} ?` })}
                                        </label>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            {[
                                                { en: 'No Experience', fr: 'Sans expérience' },
                                                { en: '6 Months', fr: '6 Mois' },
                                                { en: '1 Year', fr: '1 An' },
                                                { en: '2 Years', fr: '2 Ans' },
                                                { en: '3-5 Years', fr: '3-5 Ans' },
                                                { en: '5-10 Years', fr: '5-10 Ans' },
                                                { en: '10-15 Years', fr: '10-15 Ans' },
                                                { en: '15+ Years', fr: '15+ Ans' },
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

                                    {/* 2. Equipment */}
                                    <AnimatePresence>
                                        {currentCatEntry.experience !== '' && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[20px] font-bold text-neutral-900 flex items-center gap-2">
                                                        {t({ en: 'Which Equipment do you have?', fr: 'Quel équipement avez-vous ?' })}
                                                    </label>
                                                </div>
                                                {!NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId) && (
                                                    <div className="space-y-4">
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
                                                                {t({ en: "I don't have tools", fr: "Je n'ai pas d'outils" })}
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
                                                                        {isAdded && <Check size={16} strokeWidth={3} />}{eq}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white border-2 border-neutral-100 rounded-[22px] pl-5 pr-2 py-2 focus-within:border-[#00A082] transition-colors">
                                                            <input type="text" placeholder={t({ en: 'Add other equipment...', fr: 'Ajouter un autre équipement...' })} value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && equipmentSearch.trim()) { e.preventDefault(); addEquipment(currentCatId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="flex-1 bg-transparent outline-none text-[15px] font-medium text-neutral-900 placeholder:text-neutral-400" />
                                                            <button onClick={() => { if (equipmentSearch.trim()) { addEquipment(currentCatId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="px-5 py-3 bg-[#00A082] text-white rounded-[18px] text-[13px] font-black hover:bg-[#008C74] active:scale-95 transition-all">{t({ en: 'Add', fr: 'Ajouter' })}</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* 3. Hourly Rate — shows after equipment is set */}
                                    <AnimatePresence>
                                        {(currentCatEntry.noEquipment || currentCatEntry.equipments.length > 0 || NO_EQUIPMENT_SERVICES.includes(currentCatEntry.categoryId)) && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[17px] font-black text-neutral-900 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">3</div>
                                                        {t({ en: 'How much do you want to charge clients per Hour?', fr: 'Combien voulez-vous facturer les clients par heure?' })}
                                                    </label>
                                                </div>
                                                {/* Centered rate picker */}
                                                <motion.div variants={itemVariants} className="bg-neutral-50 rounded-[32px] p-8 border border-neutral-100 flex flex-col items-center justify-center gap-6">
                                                    <div className="flex items-center justify-center gap-6 w-full">
                                                        <button onClick={() => updateCatEntry(currentCatId, 'hourlyRate', Math.max(50, (currentCatEntry?.hourlyRate || 100) - 10))} className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#00A082] transition-all text-neutral-400 hover:text-[#00A082]"><Minus size={24} strokeWidth={3} /></button>
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-5xl font-black text-neutral-900 tracking-tighter">{currentCatEntry?.hourlyRate || 100}</span>
                                                                <span className="text-[15px] font-bold text-neutral-400">MAD/hr</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => updateCatEntry(currentCatId, 'hourlyRate', (currentCatEntry?.hourlyRate || 100) + 10)} className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#00A082] transition-all text-neutral-400 hover:text-[#00A082]"><Plus size={24} strokeWidth={3} /></button>
                                                    </div>

                                                    {tierInfo && (
                                                        <div className="px-6 py-3 bg-[#00A082] text-white rounded-full text-[14px] font-bold shadow-lg shadow-[#00A082]/20 mt-2">
                                                            {t({ en: `Suggested Market Rate: ${tierInfo.suggestedMin} - ${tierInfo.suggestedMax} MAD`, fr: `Suggéré sur le marché : ${tierInfo.suggestedMin} - ${tierInfo.suggestedMax} MAD` })}
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
                                                    <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">4</div>
                                                        {t({ en: 'Experience Description', fr: 'Description de l\'expérience' })}
                                                    </label>
                                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                            <circle cx="24" cy="24" r="20" className="fill-none stroke-neutral-100" strokeWidth="3" />
                                                            <circle cx="24" cy="24" r="20" className="fill-none stroke-[#00A082] transition-all duration-500" strokeWidth="3" strokeDasharray={126} strokeDashoffset={126 - (Math.min(currentCatEntry?.pitch?.length || 0, MIN_PITCH_CHARS) / MIN_PITCH_CHARS) * 126} strokeLinecap="round" />
                                                        </svg>
                                                        <span className={cn("text-[11px] font-black z-10", (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "text-[#00A082]" : "text-neutral-400")}>{currentCatEntry?.pitch?.length || 0}</span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={currentCatEntry?.pitch || ''}
                                                    onChange={e => updateCatEntry(currentCatId, 'pitch', e.target.value)}
                                                    placeholder={t({ en: `Describe your general experience in ${currentCatEntry.categoryName}...`, fr: `Décrivez votre expérience en ${currentCatEntry.categoryName}...` })}
                                                    rows={5}
                                                    className={cn(
                                                        "w-full px-7 py-6 bg-white border-2 rounded-[32px] text-[17px] font-medium text-neutral-900 outline-none transition-all",
                                                        (currentCatEntry?.pitch?.length || 0) >= MIN_PITCH_CHARS ? "border-[#008C74] bg-[#E6F6F2]/30" : "border-neutral-100 focus:border-[#00A082]"
                                                    )}
                                                />

                                                {/* 5. Past Work Photos — optional */}
                                                <div className="space-y-3 pt-2">
                                                    <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">5</div>
                                                        {t({ en: 'Past Work Photos', fr: 'Photos de travaux passés' })}
                                                        <span className="text-[11px] font-bold text-neutral-400">{t({ en: '(optional)', fr: '(optionnel)' })}</span>
                                                    </label>
                                                    <p className="text-[13px] text-neutral-400 font-medium">{t({ en: 'Upload photos of your past work to showcase your expertise to clients.', fr: 'Téléversez des photos pour montrer votre expertise aux clients.' })}</p>
                                                    {(categoryEntries[currentCatId]?.portfolioImages || []).length > 0 && (
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(categoryEntries[currentCatId]?.portfolioImages || []).map((src, i) => (
                                                                <div key={i} className="relative aspect-square rounded-[12px] overflow-hidden bg-neutral-100">
                                                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                                                    <button
                                                                        onClick={() => {
                                                                            const imgs = [...(categoryEntries[currentCatId]?.portfolioImages || [])];
                                                                            imgs.splice(i, 1);
                                                                            updateCatEntry(currentCatId, 'portfolioImages', imgs);
                                                                        }}
                                                                        className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                                                                    ><X size={12} className="text-white" /></button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <label className="flex items-center justify-center gap-3 w-full py-5 border-2 border-dashed border-neutral-200 rounded-[16px] cursor-pointer hover:border-[#00A082] hover:bg-[#E6F6F2]/30 transition-all">
                                                        <Upload size={20} className="text-neutral-400" />
                                                        <span className="text-[14px] font-bold text-neutral-500">{t({ en: 'Upload photos', fr: 'Téléverser des photos' })}</span>
                                                        <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                                                            const files = e.target.files;
                                                            if (!files || files.length === 0) return;
                                                            const previews: string[] = [];
                                                            for (let i = 0; i < Math.min(files.length, 8); i++) {
                                                                await new Promise<void>(resolve => {
                                                                    const reader = new FileReader();
                                                                    reader.onload = ev => { previews.push(ev.target?.result as string); resolve(); };
                                                                    reader.readAsDataURL(files[i]);
                                                                });
                                                            }
                                                            const existing = categoryEntries[currentCatId]?.portfolioImages || [];
                                                            updateCatEntry(currentCatId, 'portfolioImages', [...existing, ...previews].slice(0, 10));
                                                        }} />
                                                    </label>
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
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Your City', fr: 'Votre Ville' })}</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Tap a city to continue automatically.', fr: 'Appuyez sur une ville pour continuer automatiquement.' })}</p>
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
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{t({ en: 'Service Areas', fr: 'Zones de service' })}</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">{t({ en: 'Select the neighborhoods you cover.', fr: 'Sélectionnez les quartiers que vous couvrez.' })}</p>
                                    </motion.div>
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex items-center gap-3 bg-white border-2 border-neutral-100 rounded-[12px] px-6 py-5 focus-within:border-[#00A082] transition-all">
                                        <Search size={24} className="text-neutral-400" />
                                        <input type="text" placeholder={t({ en: 'Search neighborhood...', fr: 'Rechercher un quartier...' })} value={areaSearch} onChange={e => setAreaSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-[17px] font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-medium" />
                                    </motion.div>
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
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
                                                {t({ en: `Add "${areaSearch}"`, fr: `Ajouter "${areaSearch}"` })}
                                            </button>
                                        )}

                                        {filteredAreas.map(area => {
                                            const sel = selectedAreas.includes(area);
                                            return (
                                                <button
                                                    key={area}
                                                    onClick={() => setSelectedAreas(prev => sel ? prev.filter(x => x !== area) : [...prev, area])}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 px-5 py-5 rounded-[12px] border-2 text-[14px] font-bold transition-all',
                                                        sel ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                    )}
                                                >
                                                    {sel && <Check size={16} strokeWidth={4} />}{area}
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
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">Your Profile</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">This is how clients see you.</p>
                                    </motion.div>
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="flex flex-col items-center gap-4">
                                        <label className="cursor-pointer group relative">
                                            <div className="w-32 h-32 rounded-full bg-neutral-100 border-4 border-white overflow-hidden flex items-center justify-center group-hover:border-[#00A082] transition-all">
                                                {profileImagePreview ? <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={32} className="text-neutral-300" />}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">Change</div>
                                            </div>
                                            <div className="absolute bottom-1 right-1 w-10 h-10 bg-[#00A082] rounded-full flex items-center justify-center text-white border-[3px] border-white"><Plus size={20} strokeWidth={3} /></div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                                        </label>
                                    </motion.div>
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Full Name', fr: 'Nom complet' })}</label>
                                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t({ en: 'Your full name', fr: 'Votre nom complet' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'WhatsApp Number', fr: 'Numéro WhatsApp' })}</label>
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
                                            <p className="text-[11px] text-neutral-400 font-bold ml-1">{t({ en: '9 digits starting with 6 or 7', fr: '9 chiffres commençant par 6 ou 7' })}</p>
                                        </div>

                                        {/* Bank details — optional */}
                                        <div className="pt-4 space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-[13px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Bank Details (optional)', fr: 'Coordonnées bancaires (optionnel)' })}</p>
                                                <p className="text-[11px] text-neutral-400 font-medium leading-tight">
                                                    {t({
                                                        en: 'This info will be used to send your money directly to your account when you request a payout.',
                                                        fr: 'Ces informations seront utilisées pour envoyer votre argent directement sur votre compte lorsque vous demanderez un retrait.'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Bank Name', fr: 'Nom de la banque' })}</label>
                                                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder={t({ en: 'e.g. Attijariwafa Bank', fr: 'ex. Attijariwafa Bank' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Name on Bank Card', fr: 'Nom sur la carte bancaire' })}</label>
                                                <input type="text" value={bricolerBankCardName} onChange={e => setBricolerBankCardName(e.target.value)} placeholder={t({ en: 'Full name as on card', fr: 'Nom complet comme sur la carte' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'RIB / IBAN', fr: 'RIB / IBAN' })}</label>
                                                <input type="text" value={ribIBAN} onChange={e => setRibIBAN(e.target.value)} placeholder={t({ en: '24-digit RIB or IBAN', fr: 'RIB 24 chiffres ou IBAN' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                            </div>
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
                                                {profileImagePreview ? <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-[#00A082]"><User size={28} /></div>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-[12px] font-bold uppercase tracking-wider text-[#00A082]">Verified Pro</h3>
                                                    <div className="w-4 h-4 bg-[#FFC244] rounded-full flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={5} /></div>
                                                </div>
                                                <p className="text-[24px] font-black text-neutral-900 tracking-tight leading-tight">{fullName}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-neutral-600 font-bold text-[15px] bg-white/50 backdrop-blur-sm px-4 py-2 rounded-[8px] w-fit"><MapPin size={18} className="text-[#00A082]" />{selectedCity} · {selectedAreas.length} Areas</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedSubServices.map(id => {
                                                    const svc = ALL_SERVICES.find(s => s.subServices.some(ss => ss.id === id) || s.id === id);
                                                    const entry = categoryEntries[svc?.id || ''];
                                                    const subServiceName = svc?.subServices?.find(ss => ss.id === id)?.name || id;
                                                    return (
                                                        <span
                                                            key={id}
                                                            className={cn(
                                                                "px-4 py-2 rounded-[8px] text-[13px] font-bold transition-all flex items-center gap-2",
                                                                entry?.categoryId === 'glass_cleaning'
                                                                    ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white"
                                                                    : "bg-[#00A082] text-white"
                                                            )}
                                                        >
                                                            {subServiceName} · {entry?.hourlyRate} MAD
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                    <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-6">
                                        <div className="space-y-2 text-center">
                                            <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Ready to Start?</h2>
                                            <p className="text-neutral-500 text-[15px] font-medium leading-relaxed px-4">Connect Google to save your profile.</p>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.98 }} onClick={handleGoogleSignup} disabled={isSubmitting} className="w-full h-[64px] bg-[#00A082] hover:bg-[#008C74] text-white rounded-[16px] text-[18px] font-bold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-60">{isSubmitting ? <div className="flex flex-col items-center gap-2"><div className="w-5 h-5 border-[3px] border-white/40 border-t-white rounded-full animate-spin" /><span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{submittingStatus}</span></div> : <div className="flex items-center gap-3"><FaGoogle size={22} /><span>Connect with Google</span></div>}</motion.button>
                                        <p className="text-[13px] text-neutral-400 leading-relaxed text-center font-bold px-4">By proceeding, I agree to the <span className="text-neutral-700 underline underline-offset-4 decoration-[#00A082]/50 text-[#00A082]">Terms</span> and <span className="text-neutral-700 underline underline-offset-4 decoration-[#00A082]/50 text-[#00A082]">Privacy</span>.</p>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    {step !== 'finish' && (
                        <div className="p-6 md:p-10 bg-white border-t border-neutral-50 flex-shrink-0">
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={goNext}
                                disabled={!canGoNext()}
                                className="w-full h-16 bg-[#00A082] text-white rounded-[16px] text-[18px] font-bold flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                {step === 'service_details' && !isLastCat ? `Next Category` : step === 'profile' ? 'Save & Finish' : 'Continue'}
                                <ChevronRight size={22} strokeWidth={2.5} />
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

export default OnboardingPopup;
