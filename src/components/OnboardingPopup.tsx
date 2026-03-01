"use client";

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, Search, ChevronLeft, ChevronRight, Upload, Info, Plus, Minus, Camera, MapPin, ArrowRight, TrendingUp, User, Wrench, Save
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
import { FcGoogle } from 'react-icons/fc';
import { getAllServices, getServiceVector, type ServiceConfig } from '@/config/services_config';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS, SERVICE_TIER_RATES } from '@/config/moroccan_areas';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import SplashScreen from '@/components/SplashScreen';
import { useIsMobileViewport } from '@/lib/mobileOnly';

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
    portfolioFiles?: (File | Blob)[];
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
const NO_EQUIPMENT_SERVICES = ['errands', 'driver', 'car_rental', 'courier', 'airport', 'transport_intercity', 'private_driver', 'learn_arabic'];

const OnboardingPopup = ({ isOpen, onClose, onComplete, mode = 'onboarding', initialCategory, userData }: OnboardingPopupProps) => {
    const { showToast } = useToast();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);

    // ── Data ────────────────────────────────────────────────────────────────
    const [selectedSubServices, setSelectedSubServices] = useState<string[]>(
        mode === 'edit' && initialCategory ? initialCategory.subServices || [] : []
    );
    const [categoryEntries, setCategoryEntries] = useState<Record<string, CategoryDetail>>(
        mode === 'edit' && initialCategory ? { [initialCategory.categoryId]: initialCategory } : {}
    );
    const [activeCategoryId, setActiveCategoryId] = useState<string>(
        mode === 'edit' && initialCategory ? initialCategory.categoryId : (ALL_SERVICES[0]?.id || '')
    );
    const [currentCatIdx, setCurrentCatIdx] = useState(0);
    const [equipmentSearch, setEquipmentSearch] = useState('');

    const [selectedCity, setSelectedCity] = useState(userData?.city || '');
    const [areaSearch, setAreaSearch] = useState('');
    const [selectedAreas, setSelectedAreas] = useState<string[]>(userData?.areas || []);

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
    const [profileImageFile, setProfileImageFile] = useState<File | Blob | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(userData?.photoURL || null);

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
        return [
            { id: 'services', label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) },
            { id: 'service_details', label: t({ en: 'Details', fr: 'Détails', ar: 'التفاصيل' }) },
            { id: 'city', label: t({ en: 'City', fr: 'Ville', ar: 'المدينة' }) },
            { id: 'areas', label: t({ en: 'Work Areas', fr: 'Zones', ar: 'مناطق العمل' }) },
            { id: 'profile', label: t({ en: 'Your Profile', fr: 'Profil', ar: 'ملفك الشخصي' }) },
            { id: 'finish', label: t({ en: 'Sign Up', fr: 'Inscription', ar: 'تسجيل' }) },
        ];
    }, [t, mode]);

    const [stepIndex, setStepIndex] = useState(mode === 'edit' ? 1 : 0);
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
                        portfolioImages: [] as string[],
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
    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview immediately for better UX
        const reader = new FileReader();
        reader.onload = ev => setProfileImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        try {
            // Compress in background
            const compressedBlob = await compressImage(file);
            // Upload Blob directly instead of wrapping in File for better Safari support
            setProfileImageFile(compressedBlob);
        } catch (err) {
            console.error("Profile image compression failed:", err);
            setProfileImageFile(file); // Fallback to original
        }
    };


    // ── Image Compression ───────────────────────────────────────────────────
    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Compression timeout")), 15000);
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1024;
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
                        clearTimeout(timeout);
                        if (blob) {
                            console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB -> ${(blob.size / 1024).toFixed(1)}KB`);
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas toBlob failed'));
                        }
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = (err) => { clearTimeout(timeout); reject(err); };
            };
            reader.onerror = (err) => { clearTimeout(timeout); reject(err); };
        });
    };

    const handleUpdateProfile = async () => {
        if (!auth.currentUser) return;
        setIsSubmitting(true);
        setSubmittingStatus("Saving changes...");

        try {
            const user = auth.currentUser;

            // Map selected services to entry format
            const currentEntries = selectedSubServices.map(subId => {
                const svc = ALL_SERVICES.find(s => s.subServices?.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: svc?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 100,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: e?.portfolioImages || [],
                    portfolioFiles: e?.portfolioFiles || []
                };
            });

            setSubmittingStatus("Uploading media...");
            const categoryUploadResults: Record<string, string[]> = {};

            // 1. Upload new Portfolio Images
            const uniqueCategories = Array.from(new Set(currentEntries.map(e => e.categoryId)));
            for (const catId of uniqueCategories) {
                const catData = categoryEntries[catId];
                const existingUrls = catData?.portfolioImages?.filter(url => url.startsWith('http')) || [];

                if (catData?.portfolioFiles && catData.portfolioFiles.length > 0) {
                    const newUrls: string[] = [];
                    for (const file of catData.portfolioFiles) {
                        try {
                            const storageRef = ref(storage, `portfolio/${user.uid}/${catId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
                            const arrayBuffer = await file.arrayBuffer();
                            const res = await uploadBytes(storageRef, arrayBuffer, { contentType: 'image/jpeg' });
                            const url = await getDownloadURL(res.ref);
                            newUrls.push(url);
                        } catch (e) {
                            console.warn(`Portfolio file upload failed for ${catId}:`, e);
                        }
                    }
                    categoryUploadResults[catId] = [...existingUrls, ...newUrls];
                } else {
                    categoryUploadResults[catId] = existingUrls;
                }
            }

            // Map results back to entries
            const finalCategoryEntries = currentEntries.map(entry => ({
                id: `${entry.categoryId}_${entry.subServiceId}`,
                categoryId: entry.categoryId,
                categoryName: entry.categoryName,
                subServiceId: entry.subServiceId,
                subServiceName: entry.subServiceName,
                hourlyRate: entry.hourlyRate,
                pitch: entry.pitch,
                experience: entry.experience,
                equipments: entry.equipments,
                noEquipment: entry.noEquipment,
                portfolioImages: categoryUploadResults[entry.categoryId] || []
            }));

            // 2. Update Firestore
            setSubmittingStatus("Syncing...");
            const bricolerRef = doc(db, 'bricolers', user.uid);

            // Get current services to merge or replace
            const docSnap = await getDoc(bricolerRef);
            let updatedServices = finalCategoryEntries;

            if (docSnap.exists()) {
                const existingServices = docSnap.data().services || [];
                if (mode === 'edit') {
                    // Update only relevant ones (those in categories we are currently touched), keep others
                    const otherServices = existingServices.filter((s: any) => !uniqueCategories.includes(s.categoryId));
                    updatedServices = [...otherServices, ...finalCategoryEntries];
                } else {
                    // Add mode: append to existing (prevent duplicates)
                    const existingIds = new Set(existingServices.map((s: any) => s.id));
                    const newOnes = finalCategoryEntries.filter(s => !existingIds.has(s.id));
                    updatedServices = [...existingServices, ...newOnes];
                }
            }

            await updateDoc(bricolerRef, {
                services: updatedServices,
                ...(errandsTransport ? { errandsTransport } : {}),
                ...(movingTransport ? { movingTransport } : {}),
                ...(tourGuideAuthorizationUrl ? { tourGuideAuthorizationUrl } : {}),
                updatedAt: serverTimestamp()
            });

            showToast({ title: t({ en: 'Successfully updated!', fr: 'Mis à jour avec succès !', ar: 'تم التحديث بنجاح!' }), variant: 'success' });
            onComplete({ services: updatedServices });
            onClose();

        } catch (error: any) {
            console.error("Update error:", error);
            showToast({ title: error.message || "Update failed", variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleAdminSubmit = async () => {
        setIsSubmitting(true);
        setSubmittingStatus("Saving Bricoler...");

        try {
            const isEdit = mode === 'admin_edit';
            const metaId = isEdit && userData?.id ? userData.id : 'meta_' + Math.random().toString(36).substr(2, 9).toUpperCase();
            const claimCode = isEdit && userData?.claimCode ? userData.claimCode : 'CLAIM-' + Math.random().toString(36).substr(2, 6).toUpperCase();

            // Map selected services
            const entries = selectedSubServices.map(subId => {
                const svc = ALL_SERVICES.find(s => s.subServices?.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: svc?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 100,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: [] as string[],
                };
            });

            // For admin mode, we just collect existing portfolio images - full image upload omitted for brevity unless needed.
            const finalCategoryEntries = entries.map(e => ({
                ...e,
                portfolioImages: categoryEntries[e.categoryId]?.portfolioImages || []
            }));

            // Upload Avatar if any
            let finalAvatarUrl = userData?.photoURL || '';
            if (profileImageFile && !isEdit) {
                try {
                    const storageRef = ref(storage, `avatars/${metaId}/${Date.now()}_profile.jpg`);
                    const arrayBuffer = await profileImageFile.arrayBuffer();
                    const uploadResult = await uploadBytes(storageRef, arrayBuffer, { contentType: 'image/jpeg' });
                    finalAvatarUrl = await getDownloadURL(uploadResult.ref);
                } catch (err) { }
            } else if (profileImageFile && isEdit) {
                try {
                    const storageRef = ref(storage, `avatars/${metaId}/${Date.now()}_profile.jpg`);
                    const arrayBuffer = await profileImageFile.arrayBuffer();
                    const uploadResult = await uploadBytes(storageRef, arrayBuffer, { contentType: 'image/jpeg' });
                    finalAvatarUrl = await getDownloadURL(uploadResult.ref);
                } catch (err) { }
            }

            const cleanObj = (obj: any) => {
                const newObj: any = {};
                Object.keys(obj).forEach(key => {
                    if (obj[key] !== undefined) newObj[key] = obj[key];
                });
                return newObj;
            };

            const allPortfolioUrls = Array.from(new Set(finalCategoryEntries.flatMap(e => e.portfolioImages)));

            const bricolerData = cleanObj({
                name: (fullName || "Bricoler").trim(),
                displayName: (fullName || "Bricoler").trim(),
                avatar: finalAvatarUrl,
                photoURL: finalAvatarUrl,
                whatsappNumber: (whatsappNumber || '').trim(),
                phone: (whatsappNumber || '').trim(),
                bankName: bankName.trim(),
                bricolerBankCardName: bricolerBankCardName.trim(),
                ribIBAN: ribIBAN.trim(),
                services: finalCategoryEntries,
                portfolio: allPortfolioUrls,
                experience: finalCategoryEntries[0]?.experience || "",
                glassCleaningEquipments: finalCategoryEntries.filter(e => e.categoryId === 'glass_cleaning').flatMap(e => e.equipments),
                city: selectedCity || "",
                workAreas: selectedAreas || [],
                isActive: true,
                isBricoler: true,
                isClaimed: !!userData?.uid,
                uid: userData?.uid || null,
                metaId: metaId,
                claimCode: claimCode,
                createdAt: userData?.createdAt || serverTimestamp(),
                updatedAt: serverTimestamp(),
                numReviews: userData?.numReviews || 0,
                rating: userData?.rating || 5.0,
                completedJobs: userData?.completedJobs || 0,
            });

            const docRef = doc(db, 'bricolers', metaId);
            await setDoc(docRef, bricolerData, { merge: true });

            showToast({ title: isEdit ? 'Profile updated!' : 'Profile created successfully!', variant: 'success' });
            onComplete({ id: metaId, ...bricolerData });
            onClose();

        } catch (error: any) {
            console.error("Admin save error:", error);
            showToast({ title: error.message || "Save failed", variant: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignup = async () => {
        const provider = new GoogleAuthProvider();
        setIsSubmitting(true);
        setSubmittingStatus("Authenticating...");

        try {
            console.log("Starting Google Signup...");
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            setSubmittingStatus("Preparing profile...");

            // Map selected services to entry format
            const initialEntries = selectedSubServices.map(subId => {
                const svc = ALL_SERVICES.find(s => s.subServices?.some(ss => ss.id === subId) || s.id === subId);
                const catId = svc?.id || '';
                const e = categoryEntries[catId];
                return {
                    categoryId: catId,
                    categoryName: e?.categoryName || catId,
                    subServiceId: subId,
                    subServiceName: svc?.subServices?.find(ss => ss.id === subId)?.name || subId,
                    hourlyRate: e?.hourlyRate || 100,
                    pitch: (e?.pitch || "").trim(),
                    experience: e?.experience || "",
                    equipments: e?.noEquipment ? [] : (e?.equipments || []),
                    noEquipment: e?.noEquipment || false,
                    portfolioImages: [] as string[],
                };
            });

            // ── Upload Process ─────────────────────────────────────────────
            setSubmittingStatus("Uploading media...");
            console.log("Starting media upload for user:", user.uid);

            let finalAvatarUrl = user.photoURL || '';
            const categoryUploadResults: Record<string, string[]> = {};

            // 1. Upload Avatar
            if (profileImageFile) {
                console.log("Uploading custom avatar...");
                try {
                    const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_profile.jpg`);
                    const arrayBuffer = await profileImageFile.arrayBuffer();
                    const uploadResult = await uploadBytes(storageRef, arrayBuffer, { contentType: 'image/jpeg' });
                    finalAvatarUrl = await getDownloadURL(uploadResult.ref);
                    console.log("Avatar uploaded:", finalAvatarUrl);
                    try { await updateProfile(user, { photoURL: finalAvatarUrl }); } catch (e) { }
                } catch (err) {
                    console.warn("Avatar upload failed:", err);
                }
            }

            // 2. Upload Portfolio Images (Sequential for reliability)
            const uniqueCategories = Array.from(new Set(initialEntries.map(e => e.categoryId)));
            console.log("Categories to upload:", uniqueCategories);

            for (const catId of uniqueCategories) {
                const catData = categoryEntries[catId];
                if (catData?.portfolioFiles && catData.portfolioFiles.length > 0) {
                    console.log(`Uploading ${catData.portfolioFiles.length} files for category: ${catId}`);
                    const urls: string[] = [];
                    for (const file of catData.portfolioFiles) {
                        try {
                            const storageRef = ref(storage, `portfolio/${user.uid}/${catId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
                            const arrayBuffer = await file.arrayBuffer();
                            const res = await uploadBytes(storageRef, arrayBuffer, { contentType: 'image/jpeg' });
                            const url = await getDownloadURL(res.ref);
                            urls.push(url);
                            console.log(`Uploaded file for ${catId}:`, url);
                        } catch (e) {
                            console.warn(`Portfolio file upload failed for ${catId}:`, e);
                        }
                    }
                    categoryUploadResults[catId] = urls;
                }
            }

            // Map results back to entries
            const finalCategoryEntries = initialEntries.map(entry => ({
                ...entry,
                portfolioImages: categoryUploadResults[entry.categoryId] || []
            }));

            // Flatten for the global 'portfolio' field
            const allPortfolioUrls = Array.from(new Set(Object.values(categoryUploadResults).flat()));

            // 3. Save to Firestore
            setSubmittingStatus("Saving profile...");
            console.log("Generating Bricoler document data...");
            const bricolerRef = doc(db, 'bricolers', user.uid);
            const bricolerSnap = await getDoc(bricolerRef);
            const existingData = bricolerSnap.exists() ? bricolerSnap.data() : null;

            const cleanObj = (obj: any) => {
                const newObj: any = {};
                Object.keys(obj).forEach(key => {
                    if (obj[key] !== undefined) newObj[key] = obj[key];
                });
                return newObj;
            };

            // Upload Tour Guide authorisation if required and not yet uploaded
            const offersTourGuide = (finalCategoryEntries as CategoryDetail[]).some(
                (e) => e.categoryId === 'tour_guide',
            );

            if (offersTourGuide && !tourGuideAuthorizationUrl && !tourGuideAuthorizationFile) {
                setSubmittingStatus(null);
                setIsSubmitting(false);
                showToast({
                    variant: 'error',
                    title: t({ en: 'Tour Guide document required', fr: 'Document de guide touristique requis', ar: 'وثيقة الترخيص للمرشد السياحي مطلوبة' }),
                    description: t({
                        en: 'Please upload your official Tour Guide authorisation before continuing.',
                        fr: 'Veuillez télécharger votre autorisation officielle de guide touristique avant de continuer.',
                        ar: 'يرجى تحميل ترخيصك القانوني كمرشد سياحي قبل المتابعة.'
                    })
                });
                return;
            }

            let finalTourGuideAuthUrl = tourGuideAuthorizationUrl;
            if (offersTourGuide && tourGuideAuthorizationFile && !tourGuideAuthorizationUrl) {
                if (tourGuideAuthorizationFile) {
                    try {
                        setSubmittingStatus("Uploading authorisation...");
                        const authRef = ref(storage, `portfolio/${user.uid}/tour_guide/${Date.now()}_authorization.jpg`);
                        const arrayBuffer = await tourGuideAuthorizationFile.arrayBuffer();
                        await uploadBytes(authRef, arrayBuffer);
                        finalTourGuideAuthUrl = await getDownloadURL(authRef);
                        setTourGuideAuthorizationUrl(finalTourGuideAuthUrl);
                    } catch (e) {
                        console.error('Tour guide authorisation upload failed', e);
                        throw e;
                    }
                }
            }

            const bricolerData = cleanObj({
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
                services: finalCategoryEntries,
                portfolio: allPortfolioUrls,
                experience: finalCategoryEntries[0]?.experience || "",
                glassCleaningEquipments: finalCategoryEntries.filter(e => e.categoryId === 'glass_cleaning').flatMap(e => e.equipments),
                city: selectedCity || "",
                workAreas: selectedAreas || [],
                errandsTransport: errandsTransport || '',
                movingTransport: movingTransport || '',
                tourGuideAuthorizationUrl: finalTourGuideAuthUrl || '',
                isBricoler: true,
                isActive: true,
                isVerified: false,
                calendarSlots: existingData?.calendarSlots || [],
                rating: existingData?.rating || 0,
                completedJobs: existingData?.completedJobs || 0,
                stats: existingData?.stats || { rating: 0, completedJobs: 0, clientHistory: [] },
                createdAt: existingData?.createdAt || serverTimestamp(),
                lastLoginAt: serverTimestamp()
            });

            await setDoc(bricolerRef, bricolerData, { merge: true });
            console.log("Bricoler document written");

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
            console.log("Client document written");

            // 4. Update city stats
            setSubmittingStatus("Finalizing...");
            const cityRef = doc(db, 'city_services', selectedCity);
            const citySnap = await getDoc(cityRef);
            const serviceIds = [...new Set(finalCategoryEntries.map(e => e.categoryId))];
            const subServiceIds = finalCategoryEntries.map(e => e.subServiceId);

            if (!citySnap.exists()) {
                await setDoc(cityRef, { active_services: serviceIds, active_sub_services: subServiceIds, work_areas: selectedAreas, total_pros: 1, lastUpdated: serverTimestamp() });
            } else {
                const existingCityData = citySnap.data();
                const updatedServices = [...new Set([...(existingCityData.active_services || []), ...serviceIds])];
                const updatedSubServices = [...new Set([...(existingCityData.active_sub_services || []), ...subServiceIds])];
                const updatedAreas = [...new Set([...(existingCityData.work_areas || []), ...selectedAreas])];
                await updateDoc(cityRef, { active_services: updatedServices, active_sub_services: updatedSubServices, work_areas: updatedAreas, total_pros: (existingCityData.total_pros || 0) + 1, lastUpdated: serverTimestamp() });
            }

            console.log("Signup complete, redirecting...");
            setSubmittingStatus("Redirecting...");
            onComplete({ services: finalCategoryEntries, city: selectedCity, availability });
        } catch (error: any) {
            console.error('Signup error:', error);
            showToast({
                variant: 'error',
                title: t({ en: 'Sign-up failed', fr: 'Échec de l’inscription', ar: 'فشل التسجيل' }),
                description: error.message || t({ en: 'An error occurred during signup.', fr: 'Une erreur est survenue pendant l’inscription.', ar: 'حدث خطأ أثناء التسجيل.' })
            });
            setSubmittingStatus(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isLastCat = currentCatIdx === selectedCategoryIds.length - 1;
    const pitchLen = currentCatEntry?.pitch?.trim().length || 0;

    return (
        <>
            {/* Full-screen submission splash — separate AnimatePresence so keys never collide */}
            <AnimatePresence key="onboarding-splash-presence">
                {isSubmitting && <SplashScreen key="onboarding-splash-indicator" />}
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
                                            ? t({ en: 'Availability', fr: 'Disponibilité', ar: 'التوفر' })
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
                        <div className="flex-1 overflow-y-auto no-scrollbar" ref={scrollContainerRef}>
                            <AnimatePresence mode="wait" custom={direction}>

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
                                                    className="flex flex-wrap gap-2.5"
                                                >
                                                    {ALL_SERVICES.find(c => c.id === activeCategoryId)?.subServices.map((sub, idx) => {
                                                        const isSelected = selectedSubServices.includes(sub.id);
                                                        return (
                                                            <motion.button
                                                                key={sub.id}
                                                                initial={{ opacity: 0, scale: 0.6 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{
                                                                    type: 'spring',
                                                                    stiffness: 380,
                                                                    damping: 20,
                                                                    delay: idx * 0.05
                                                                }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => toggleSubService(activeCategoryId, sub.id, sub.name)}
                                                                className={cn(
                                                                    "px-5 py-3 rounded-full border text-[15px] font-bold transition-all flex items-center gap-2",
                                                                    isSelected
                                                                        ? "bg-[#E6F6F2] border-[#00A082] text-[#00A082] shadow-[0_2px_8px_rgba(0,160,130,0.1)]"
                                                                        : "bg-white border-[#E6E6E6] text-[#1D1D1D] hover:border-[#1D1D1D] shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                                                                )}
                                                            >
                                                                {isSelected && <Check size={14} strokeWidth={4} />}
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
                                                        <button
                                                            key={id}
                                                            onClick={() => { setDirection(idx > currentCatIdx ? 1 : -1); setCurrentCatIdx(idx); setEquipmentSearch(''); }}
                                                            className={cn(
                                                                'flex items-center gap-2 px-6 py-3 rounded-[12px] text-[13px] font-bold whitespace-nowrap border-2 transition-all',
                                                                idx === currentCatIdx ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : done ? 'bg-[#00A082]/5 text-[#00A082]/60 border-neutral-100' : 'bg-white text-neutral-400 border-neutral-100'
                                                            )}
                                                        >
                                                            {done && <Check size={12} strokeWidth={4} />}
                                                            {t({ en: s?.categoryName || id, fr: s?.categoryName || id })}
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
                                                    <h2 className="text-3xl font-black text-neutral-900 leading-tight">{t({ en: currentCatEntry.categoryName, fr: currentCatEntry.categoryName })}</h2>
                                                    <p className="text-[#00A082] text-xs font-black tracking-widest uppercase">{t({ en: 'Service Category', fr: 'Catégorie de service', ar: 'فئة الخدمة' })}</p>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* 1. Experience */}
                                        <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4">
                                            <label className="text-[20px] font-bold text-neutral-900 flex items-center gap-2">
                                                {t({
                                                    en: `How many years of experience do you have in ${currentCatEntry.categoryName}?`,
                                                    fr: `Combien d'années d'expérience avez-vous en ${currentCatEntry.categoryName} ?`,
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
                                                        { id: 'van', label: { en: '🚐 Van', fr: '🚐 Camionnette', ar: '🚐 سيارة \"فان\"' } },
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
                                            {currentCatEntry.experience !== '' && (
                                                <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-4 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[20px] font-bold text-neutral-900 flex items-center gap-2">
                                                            {t({ en: 'Which Equipment do you have?', fr: 'Quel équipement avez-vous ?', ar: 'ما هي المعدات التي تمتلكها؟' })}
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
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* 2.5 — Tour Guide: Legal authorisation upload */}
                                        {currentCatId === 'tour_guide' && currentCatEntry.experience !== '' && (
                                            <motion.div variants={itemVariants} initial="hidden" animate="show" className="space-y-3 pt-2">
                                                <label className="text-[20px] font-bold text-neutral-900 block">
                                                    {t({
                                                        en: 'Upload your official Tour Guide authorisation',
                                                        fr: 'Téléchargez votre autorisation officielle de guide touristique',
                                                        ar: 'حمّل الترخيص القانوني الذي يثبت أنك مرشد سياحي معتمد'
                                                    })}
                                                </label>
                                                <p className="text-[13px] text-neutral-500">
                                                    {t({
                                                        en: 'This document is required if you offer Tour Guide services. It will be shown to clients inside your profile.',
                                                        fr: 'Ce document est obligatoire si vous proposez le service de guide touristique. Il sera visible dans votre profil côté client.',
                                                        ar: 'هذا المستند إجباري إذا كنت تقدم خدمة المرشد السياحي، وسيظهر للزبائن داخل ملفك الشخصي.'
                                                    })}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <label className="inline-flex items-center gap-2 px-4 py-3 rounded-[12px] border-2 border-dashed border-neutral-200 cursor-pointer hover:border-[#00A082]/50 bg-neutral-50">
                                                        <Upload size={18} className="text-neutral-500" />
                                                        <span className="text-[14px] font-bold text-neutral-800">
                                                            {tourGuideAuthorizationUrl || tourGuideAuthorizationFile
                                                                ? t({ en: 'Replace document', fr: 'Remplacer le document', ar: 'استبدال المستند' })
                                                                : t({ en: 'Select file (PDF or image)', fr: 'Sélectionner un fichier (PDF ou image)', ar: 'اختر ملفاً (PDF أو صورة)' })
                                                            }
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0] || null;
                                                                setTourGuideAuthorizationFile(file);
                                                            }}
                                                        />
                                                    </label>
                                                    {(tourGuideAuthorizationUrl || tourGuideAuthorizationFile) && (
                                                        <span className="text-[13px] text-[#00A082] font-bold">
                                                            {t({ en: 'Document attached', fr: 'Document attaché', ar: 'تم إرفاق المستند' })}
                                                        </span>
                                                    )}
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
                                                            {t({ en: 'How much do you want to charge clients per Hour?', fr: 'Combien voulez-vous facturer les clients par heure?', ar: 'كم تريد أن تتقاضى من العملاء في الساعة؟' })}
                                                        </label>
                                                    </div>
                                                    {/* Centered rate picker */}
                                                    <motion.div variants={itemVariants} className="bg-neutral-50 rounded-[32px] p-8 border border-neutral-100 flex flex-col items-center justify-center gap-6">
                                                        <div className="flex items-center justify-center gap-6 w-full">
                                                            <button onClick={() => updateCatEntry(currentCatId, 'hourlyRate', Math.max(50, (currentCatEntry?.hourlyRate || 100) - 10))} className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#00A082] transition-all text-neutral-400 hover:text-[#00A082]"><Minus size={24} strokeWidth={3} /></button>
                                                            <div className="flex flex-col items-center">
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-5xl font-black text-neutral-900 tracking-tighter">{currentCatEntry?.hourlyRate || 100}</span>
                                                                    <span className="text-[15px] font-bold text-neutral-400">{t({ en: 'MAD/hr', fr: 'MAD/h', ar: 'درهم/ساعة' })}</span>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => updateCatEntry(currentCatId, 'hourlyRate', (currentCatEntry?.hourlyRate || 100) + 10)} className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#00A082] transition-all text-neutral-400 hover:text-[#00A082]"><Plus size={24} strokeWidth={3} /></button>
                                                        </div>

                                                        {tierInfo && (
                                                            <div className="px-6 py-3 bg-[#00A082] text-white rounded-full text-[14px] font-bold shadow-lg shadow-[#00A082]/20 mt-2">
                                                                {t({ en: `Suggested Market Rate: ${tierInfo.suggestedMin} - ${tierInfo.suggestedMax} MAD`, fr: `Suggéré sur le marché : ${tierInfo.suggestedMin} - ${tierInfo.suggestedMax} MAD`, ar: `سعر السوق المقترح: ${tierInfo.suggestedMin} - ${tierInfo.suggestedMax} درهم` })}
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
                                                            {t({ en: 'Experience Description', fr: 'Description de l\'expérience', ar: 'وصف الخبرة' })}
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
                                                        placeholder={t({ en: `Describe your general experience in ${currentCatEntry.categoryName}...`, fr: `Décrivez votre expérience en ${currentCatEntry.categoryName}...`, ar: `صف خبرتك العامة في ${currentCatEntry.categoryName}...` })}
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
                                                            {t({ en: 'Past Work Photos', fr: 'Photos de travaux passés', ar: 'صور لأعمال سابقة' })}
                                                            <span className="text-[11px] font-bold text-neutral-400">{t({ en: '(optional)', fr: '(optionnel)', ar: '(اختياري)' })}</span>
                                                        </label>
                                                        <p className="text-[13px] text-neutral-400 font-medium">{t({ en: 'Upload photos of your past work to showcase your expertise to clients.', fr: 'Téléversez des photos pour montrer votre expertise aux clients.', ar: 'قم بتحميل صور لأعمال سابقة لعرض خبرتك للعملاء.' })}</p>
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
                                                            <span className="text-[14px] font-bold text-neutral-500">{t({ en: 'Upload photos', fr: 'Téléverser des photos', ar: 'تحميل الصور' })}</span>
                                                            <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                                                                const files = e.target.files;
                                                                if (!files || files.length === 0) return;
                                                                const newFiles = Array.from(files);

                                                                // 1. Prepare previews immediately
                                                                const previewTasks = newFiles.map(file => new Promise<string>(resolve => {
                                                                    const reader = new FileReader();
                                                                    reader.onload = ev => resolve(ev.target?.result as string);
                                                                    reader.readAsDataURL(file);
                                                                }));
                                                                const previews = await Promise.all(previewTasks);


                                                                const existingImgs = categoryEntries[currentCatId]?.portfolioImages || [];
                                                                updateCatEntry(currentCatId, 'portfolioImages', [...existingImgs, ...previews].slice(0, 10));

                                                                // 2. Compress in background
                                                                const compressionTasks = newFiles.map(async (file) => {
                                                                    try {
                                                                        const blob = await compressImage(file);
                                                                        return new File([blob], file.name, { type: 'image/jpeg' });
                                                                    } catch (err) {
                                                                        return file; // fallback
                                                                    }
                                                                });

                                                                const compressedFiles = await Promise.all(compressionTasks);
                                                                const existingFiles = categoryEntries[currentCatId]?.portfolioFiles || [];
                                                                updateCatEntry(currentCatId, 'portfolioFiles', [...existingFiles, ...compressedFiles].slice(0, 10));
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
                                                    const allAreas = MOROCCAN_CITIES_AREAS[selectedCity] || [];
                                                    setSelectedAreas(prev =>
                                                        prev.length === allAreas.length ? [] : allAreas
                                                    );
                                                }}
                                                className={cn(
                                                    'col-span-2 flex items-center justify-center gap-2 px-5 py-5 rounded-[12px] border-2 text-[14px] font-bold transition-all mb-2',
                                                    selectedAreas.length === (MOROCCAN_CITIES_AREAS[selectedCity] || []).length && (MOROCCAN_CITIES_AREAS[selectedCity] || []).length > 0
                                                        ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]'
                                                        : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                )}
                                            >
                                                {selectedAreas.length === (MOROCCAN_CITIES_AREAS[selectedCity] || []).length && (MOROCCAN_CITIES_AREAS[selectedCity] || []).length > 0 && <Check size={16} strokeWidth={4} />}
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
                                            <label className="cursor-pointer group relative">
                                                <div className="w-32 h-32 rounded-full bg-neutral-100 border-4 border-white overflow-hidden flex items-center justify-center group-hover:border-[#00A082] transition-all">
                                                    {profileImagePreview ? <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={32} className="text-neutral-300" />}
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">{t({ en: 'Change', fr: 'Modifier', ar: 'تغيير' })}</div>
                                                </div>
                                                <div className="absolute bottom-1 right-1 w-10 h-10 bg-[#00A082] rounded-full flex items-center justify-center text-white border-[3px] border-white"><Plus size={20} strokeWidth={3} /></div>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                                            </label>
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

                                            {/* Bank details — optional */}
                                            <div className="pt-4 space-y-4">
                                                <div className="space-y-1">
                                                    <p className="text-[13px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Bank Details (optional)', fr: 'Coordonnées bancaires (optionnel)', ar: 'بيانات البنك (اختياري)' })}</p>
                                                    <p className="text-[11px] text-neutral-400 font-medium leading-tight">
                                                        {t({
                                                            en: 'This info will be used to send your money directly to your account when you request a payout.',
                                                            fr: 'Ces informations seront utilisées pour envoyer votre argent directement sur votre compte lorsque vous demanderez un retrait.',
                                                            ar: 'ستستخدم هذه المعلومات لإرسال أموالك مباشرة إلى حسابك عند طلب السحب.'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Bank Name', fr: 'Nom de la banque', ar: 'اسم البنك' })}</label>
                                                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder={t({ en: 'e.g. Attijariwafa Bank', fr: 'ex. Attijariwafa Bank', ar: 'مثل: التجاري وفا بنك' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'Name on Bank Card', fr: 'Nom sur la carte bancaire', ar: 'الاسم على بطاقة البنك' })}</label>
                                                    <input type="text" value={bricolerBankCardName} onChange={e => setBricolerBankCardName(e.target.value)} placeholder={t({ en: 'Full name as on card', fr: 'Nom complet comme sur la carte', ar: 'الاسم الكامل كما في البطاقة' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[14px] font-bold text-neutral-900 ml-1">{t({ en: 'RIB / IBAN', fr: 'RIB / IBAN', ar: 'رقم الحساب (RIB)' })}</label>
                                                    <input type="text" value={ribIBAN} onChange={e => setRibIBAN(e.target.value)} placeholder={t({ en: '24-digit RIB or IBAN', fr: 'RIB 24 chiffres ou IBAN', ar: 'رقم الحساب من 24 رقماً' })} className="w-full px-6 py-4 bg-white border-2 border-neutral-100 rounded-[12px] text-[17px] font-bold text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
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
                                                                    "px-4 py-2 rounded-[8px] text-[13px] font-bold transition-all flex items-center gap-2",
                                                                    entry?.categoryId === 'glass_cleaning'
                                                                        ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white"
                                                                        : "bg-[#0CB380] text-white"
                                                                )}
                                                            >
                                                                {t({ en: subServiceName, fr: subServiceName })} · {entry?.hourlyRate} {t({ en: 'MAD', fr: 'MAD', ar: 'درهم' })}
                                                            </span>
                                                        )
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
                                                        ? t({ en: 'Connect Google to save your profile.', fr: 'Connectez Google pour enregistrer votre profil.', ar: 'اربط حساب جوجل لحفظ ملفك الشخصي.' })
                                                        : t({ en: 'Save your updated service details.', fr: 'Enregistrez vos informations de service mises à jour.', ar: 'حفظ تفاصيل الخدمة المحدثة.' })}
                                                </p>
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={mode === 'onboarding' ? handleGoogleSignup : (mode === 'admin_add' || mode === 'admin_edit') ? handleAdminSubmit : handleUpdateProfile}
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
                                                        {mode === 'onboarding' ? (
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
                                    {step === 'service_details' && !isLastCat
                                        ? t({ en: 'Next Category', fr: 'Catégorie suivante', ar: 'الفئة التالية' })
                                        : step === 'profile'
                                            ? t({ en: 'Save & Finish', fr: 'Enregistrer et terminer', ar: 'حفظ وإنهاء' })
                                            : t({ en: 'Continue', fr: 'Continuer', ar: 'متابعة' })}
                                    <ChevronRight size={22} strokeWidth={2.5} />
                                </motion.button>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            </AnimatePresence >
        </>
    );
};

export default OnboardingPopup;
