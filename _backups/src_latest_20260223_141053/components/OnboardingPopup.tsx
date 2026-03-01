"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, Search, ChevronLeft, ChevronRight, Upload, Info, Plus, Minus, Camera, MapPin, ArrowRight, TrendingUp, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db, storage } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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
import { getAllServices, type ServiceConfig } from '@/config/services_config';
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

interface ServiceEntry {
    serviceId: string;
    serviceName: string;
    hourlyRate: number;
    pitch: string;
    experience: string;
    skills: string[];
    equipments: string[];
    noEquipment: boolean;
}

const ALL_SERVICES = getAllServices();
const MIN_PITCH_CHARS = 50;

// ── Skills suggestions per service ──────────────────────────────────────────
const SERVICE_SKILLS_SUGGESTIONS: Record<string, string[]> = {
    cleaning: [
        "Deep cleaning expert", "Hospitality-level standards", "Detail oriented",
        "Eco-friendly products", "Bathroom & kitchen sanitization",
        "Oven & appliance cleaning", "Floor polishing", "Move-in/out cleaning"
    ],
    glass_cleaning: [
        "Streak-free technique", "Hard water stain removal", "Post-construction cleanup",
        "Squeegee proficiency", "Mirror polishing", "Silicone & residue removal",
        "Window frame cleaning", "High-reach surface access"
    ],
    plumbing: [
        "Leak detection", "Bathroom & kitchen fixtures", "Emergency repairs",
        "Drain unclogging", "Pipe installation", "Water heater setup",
        "Shower & tap fitting", "Thread sealing"
    ],
    electricity: [
        "Wiring & rewiring", "Circuit diagnostics", "LED lighting installation",
        "Outlet & switch replacement", "Electrical panel work", "Safety inspections",
        "Home automation basics", "Inverter/generator setup"
    ],
    painting: [
        "Surface preparation", "Color matching", "Clean edge finishing",
        "Wallpaper application", "Decorative & textured finishes",
        "Sanding & priming", "Spray painting", "Exterior painting"
    ],
    handyman: [
        "General repairs", "Furniture assembly", "TV & shelf mounting",
        "Door repair & locks", "Drywall patching", "Caulking & sealing",
        "Picture & curtain hanging", "Minor tile work"
    ],
    furniture_assembly: [
        "IKEA assembly expert", "Power tool proficient", "Complex flatpack reading",
        "Wardrobe & closet assembly", "Office furniture setup", "Bed frame assembly",
        "TV unit & storage", "Time-efficient assembly"
    ],
    mounting: [
        "TV mounting (all brands)", "Shelf installation", "Curtain rod hanging",
        "Mirror & wall art", "Laser-level precision", "Bracket selection advice",
        "Cable management", "Soundbar & projector mounting"
    ],
    appliance_installation: [
        "Washing machine setup", "Dishwasher installation", "Air conditioner fitting",
        "Water heater install", "Hood & extractor fan", "Electrical safety check",
        "Gas appliance connections", "Fridge repositioning"
    ],
    moving: [
        "Heavy lifting", "Fragile item packing & wrapping", "Truck loading/unloading",
        "Furniture disassembly & reassembly", "Furniture protection blankets",
        "Organized & labeled packing", "Same-day moves", "Office relocations"
    ],
    errands: [
        "Punctual delivery", "Efficient route planning", "Grocery shopping expert",
        "Careful handler", "Multilingual communication", "App-savvy for order tracking"
    ],
    gardening: [
        "Lawn care & mowing", "Trimming & pruning", "Seasonal planting",
        "Irrigation setup", "Landscape design", "Pest & weed control",
        "Tree care", "Balcony & rooftop gardens"
    ],
    babysitting: [
        "Safety certified", "Creative play activities", "Homework support",
        "First Aid & CPR trained", "Infant & newborn care",
        "Meal preparation for kids", "Sleep routine management"
    ],
    elderly_assistance: [
        "Patient & empathetic", "Light housekeeping", "Meal preparation",
        "Medication reminders", "Mobility & physiotherapy support",
        "Companionship walks", "Doctor appointment assistance"
    ],
    driver: [
        "Route optimization", "Safe & defensive driving", "Punctuality",
        "Vehicle maintenance knowledge", "Airport transfers", "VIP client experience"
    ],
};

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
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [serviceEntries, setServiceEntries] = useState<Record<string, ServiceEntry>>({});
    const [currentServiceIdx, setCurrentServiceIdx] = useState(0);
    const [skillSearch, setSkillSearch] = useState('');
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

    const [fullName, setFullName] = useState('');
    const [nidNumber, setNidNumber] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);

    // ── Steps ────────────────────────────────────────────────────────────────
    const STEPS = useMemo(() => [
        { id: 'services', label: 'Services' },
        { id: 'service_details', label: 'Details' },
        { id: 'availability', label: 'Availability' },
        { id: 'city', label: 'City' },
        { id: 'areas', label: 'Work Areas' },
        { id: 'profile', label: 'Your Profile' },
        { id: 'finish', label: 'Sign Up' },
    ], []);

    const [stepIndex, setStepIndex] = useState(0);
    const step = STEPS[stepIndex]?.id || 'services';
    const totalSteps = STEPS.length;

    // ── Current service being configured ────────────────────────────────────
    const currentSvcId = selectedServices[currentServiceIdx];
    const currentSvc = ALL_SERVICES.find(s => s.id === currentSvcId);
    const currentEntry: ServiceEntry | undefined = currentSvcId ? serviceEntries[currentSvcId] : undefined;
    const tierInfo = currentSvcId ? SERVICE_TIER_RATES[currentSvcId] : undefined;

    const filteredAreas = useMemo(() => {
        const all = selectedCity ? MOROCCAN_CITIES_AREAS[selectedCity] || [] : [];
        if (!areaSearch.trim()) return all;
        return all.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
    }, [selectedCity, areaSearch]);

    // ── Validation ───────────────────────────────────────────────────────────
    const currentEntryValid = (entry: ServiceEntry | undefined): boolean => {
        if (!entry) return false;
        return (
            entry.experience !== '' &&
            entry.skills.length > 0 &&
            (entry.noEquipment || entry.equipments.length > 0) &&
            entry.hourlyRate > 0 &&
            entry.pitch.trim().length >= MIN_PITCH_CHARS
        );
    };

    const canGoNext = () => {
        if (step === 'services') return selectedServices.length > 0;
        if (step === 'service_details') return currentEntryValid(currentEntry);
        if (step === 'availability') return Object.values(availability).some(slots => slots.length > 0);
        if (step === 'city') return selectedCity !== '';
        if (step === 'areas') return selectedAreas.length > 0;
        if (step === 'profile') return fullName.trim().length > 2 && nidNumber.trim().length > 3 && whatsappNumber.length >= 9;
        return true;
    };

    const goNext = () => {
        if (!canGoNext()) return;
        if (step === 'service_details' && currentServiceIdx < selectedServices.length - 1) {
            setCurrentServiceIdx(i => i + 1);
            setSkillSearch('');
            setEquipmentSearch('');
            return;
        }
        if (stepIndex < totalSteps - 1) setStepIndex(s => s + 1);
    };

    const goBack = () => {
        if (step === 'service_details' && currentServiceIdx > 0) {
            setCurrentServiceIdx(i => i - 1);
            setSkillSearch('');
            setEquipmentSearch('');
            return;
        }
        if (stepIndex > 0) setStepIndex(s => s - 1);
    };

    // ── Service selection ────────────────────────────────────────────────────
    const toggleService = (id: string) => {
        setSelectedServices(prev => {
            if (prev.includes(id)) {
                return prev.filter(s => s !== id);
            } else {
                const tier = SERVICE_TIER_RATES[id];
                const svc = ALL_SERVICES.find(s => s.id === id);
                setServiceEntries(e => ({
                    ...e,
                    [id]: e[id] || {
                        serviceId: id,
                        serviceName: svc?.name || id,
                        hourlyRate: tier?.suggestedMin || 100,
                        pitch: '',
                        experience: '',
                        skills: [],
                        equipments: [],
                        noEquipment: NO_EQUIPMENT_SERVICES.includes(id),
                    }
                }));
                return [...prev, id];
            }
        });
    };

    const updateEntry = (id: string, key: keyof ServiceEntry, value: any) => {
        setServiceEntries(prev => ({
            ...prev,
            [id]: { ...prev[id], [key]: value }
        }));
    };

    const addSkill = (id: string, skill: string) => {
        const entry = serviceEntries[id];
        if (!entry || entry.skills.includes(skill)) return;
        updateEntry(id, 'skills', [...entry.skills, skill]);
    };

    const removeSkill = (id: string, skill: string) => {
        const entry = serviceEntries[id];
        if (!entry) return;
        updateEntry(id, 'skills', entry.skills.filter(s => s !== skill));
    };

    const addEquipment = (id: string, eq: string) => {
        const entry = serviceEntries[id];
        if (!entry || entry.equipments.includes(eq)) return;
        updateEntry(id, 'equipments', [...entry.equipments, eq]);
        updateEntry(id, 'noEquipment', false);
    };

    const removeEquipment = (id: string, eq: string) => {
        const entry = serviceEntries[id];
        if (!entry) return;
        updateEntry(id, 'equipments', entry.equipments.filter(e => e !== eq));
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

            let finalAvatarUrl = user.photoURL || "";
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
                    finalAvatarUrl = await Promise.race([uploadPromise, timeoutPromise]);
                } catch (uploadError: any) {
                    console.warn("Photo upload skipped/failed:", uploadError.message);
                    setSubmittingStatus("Proceeding...");
                    showToast({ variant: 'info', title: "Photo upload skipped", description: "Continuing with default photo." });
                }
            }

            setSubmittingStatus("Creating account...");
            const entries = Object.values(serviceEntries)
                .filter(e => selectedServices.includes(e.serviceId))
                .map(e => ({
                    serviceId: e.serviceId,
                    serviceName: e.serviceName || "Service",
                    hourlyRate: e.hourlyRate || 100,
                    pitch: (e.pitch || "").trim(),
                    experience: e.experience || "",
                    skills: e.skills || [],
                    equipments: e.noEquipment ? [] : (e.equipments || []),
                    noEquipment: e.noEquipment || false,
                }));

            const bricolerRef = doc(db, 'bricolers', user.uid);
            const bricolerSnap = await getDoc(bricolerRef);
            const existingData = bricolerSnap.exists() ? bricolerSnap.data() : null;

            const bricolerData = {
                uid: user.uid,
                displayName: (fullName || user.displayName || "Bricoler").trim(),
                name: (fullName || user.displayName || "Bricoler").trim(),
                email: user.email || "",
                avatar: finalAvatarUrl || "",
                photoURL: finalAvatarUrl || "",
                nidNumber: (nidNumber || "").trim(),
                whatsappNumber: (whatsappNumber || "").trim(),
                services: entries,
                // Flatten skills/experience across all services for quick access
                experience: entries[0]?.experience || "",
                skills: [...new Set(entries.flatMap(e => e.skills))],
                glassCleaningEquipments: entries.find(e => e.serviceId === 'glass_cleaning')?.equipments || [],
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
            const clientSnap = await getDoc(clientRef);
            if (!clientSnap.exists()) {
                await setDoc(clientRef, {
                    uid: user.uid,
                    name: bricolerData.name,
                    email: bricolerData.email,
                    photoURL: bricolerData.photoURL,
                    whatsappNumber: bricolerData.whatsappNumber,
                    createdAt: serverTimestamp(),
                    isBricoler: true
                });
            } else {
                await updateDoc(clientRef, { isBricoler: true, whatsappNumber: bricolerData.whatsappNumber || clientSnap.data().whatsappNumber || "" });
            }

            // Update city_services
            setSubmittingStatus("Finalizing city stats...");
            const cityRef = doc(db, 'city_services', selectedCity);
            const citySnap = await getDoc(cityRef);
            const serviceIds = entries.map(e => e.serviceId);
            if (!citySnap.exists()) {
                await setDoc(cityRef, { active_services: serviceIds, active_sub_services: [], work_areas: selectedAreas, total_pros: 1, lastUpdated: serverTimestamp() });
            } else {
                const existingCityData = citySnap.data();
                const updatedServices = [...new Set([...(existingCityData.active_services || []), ...serviceIds])];
                const updatedAreas = [...new Set([...(existingCityData.work_areas || []), ...selectedAreas])];
                await updateDoc(cityRef, { active_services: updatedServices, work_areas: updatedAreas, total_pros: (existingCityData.total_pros || 0) + 1, lastUpdated: serverTimestamp() });
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

    const isLastService = currentServiceIdx === selectedServices.length - 1;
    const pitchLen = currentEntry?.pitch?.trim().length || 0;

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
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={stepIndex === 0 && currentServiceIdx === 0 ? onClose : goBack}
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-neutral-100 text-neutral-900 transition-all hover:bg-neutral-50 active:scale-95"
                        >
                            {stepIndex === 0 ? <X size={22} strokeWidth={2.5} /> : <ChevronLeft size={26} strokeWidth={2.5} />}
                        </motion.button>
                        {/* Progress pills */}
                        <div className="flex items-center gap-1.5 w-full max-w-[160px]">
                            {STEPS.map((s, idx) => {
                                const currentIdx = STEPS.findIndex(si => si.id === step);
                                const isPassed = currentIdx > idx;
                                const current = s.id === step;
                                return (
                                    <div key={s.id} className="flex-1 h-1.5 relative overflow-hidden rounded-full bg-neutral-100">
                                        <motion.div
                                            initial={false}
                                            animate={{
                                                width: (isPassed || current) ? "100%" : "0%",
                                                backgroundColor: current ? "#FFC244" : "#00A082"
                                            }}
                                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <div className="w-12" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <AnimatePresence mode="wait">

                            {/* ── STEP: Services ── */}
                            {step === 'services' && (
                                <motion.div key="services" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="p-6 md:p-10 space-y-6">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">Your Services</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">Pick one or more categories.</p>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {ALL_SERVICES.map(service => {
                                            const selected = selectedServices.includes(service.id);
                                            return (
                                                <button
                                                    key={service.id}
                                                    onClick={() => toggleService(service.id)}
                                                    className={cn(
                                                        'relative flex flex-col items-center justify-center gap-3 p-6 rounded-[28px] border-2 transition-all duration-300 text-center',
                                                        selected ? 'border-[#00A082] bg-[#E6F6F2]' : 'border-neutral-100 bg-white hover:border-neutral-200 text-neutral-900'
                                                    )}
                                                >
                                                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-colors", selected ? "bg-[#00A082] text-white" : "bg-neutral-50 text-neutral-400")}>
                                                        <service.icon size={28} strokeWidth={1.5} />
                                                    </div>
                                                    <span className={cn(
                                                        "text-[15px] font-black tracking-tight",
                                                        service.name === 'Glass' ? "text-transparent bg-clip-text bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728]" : (selected ? "text-[#00A082]" : "text-neutral-900")
                                                    )}>
                                                        {service.name}
                                                    </span>
                                                    {selected && (
                                                        <div className="absolute top-3 right-3 w-6 h-6 bg-[#00A082] rounded-full flex items-center justify-center">
                                                            <Check size={14} className="text-white" strokeWidth={4} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP: Per-Service Details ── */}
                            {step === 'service_details' && currentSvc && currentEntry && (
                                <motion.div
                                    key={`svc-detail-${currentSvcId}`}
                                    initial={{ x: 30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -30, opacity: 0 }}
                                    className="p-6 md:p-10 space-y-8 pb-10"
                                >
                                    {selectedServices.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                            {selectedServices.map((id, idx) => {
                                                const s = ALL_SERVICES.find(sv => sv.id === id);
                                                const done = currentEntryValid(serviceEntries[id]);
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => { setCurrentServiceIdx(idx); setSkillSearch(''); setEquipmentSearch(''); }}
                                                        className={cn(
                                                            'flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-black whitespace-nowrap border-2 transition-all',
                                                            idx === currentServiceIdx ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : done ? 'bg-[#00A082]/5 text-[#00A082]/60 border-neutral-100' : 'bg-white text-neutral-400 border-neutral-100'
                                                        )}
                                                    >
                                                        {done && <Check size={12} strokeWidth={4} />}
                                                        {s?.name || id}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">{currentSvc.name} Expertise</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">Tell us about your background.</p>
                                    </div>

                                    {/* Experience */}
                                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
                                        <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">1</div>
                                            Experience Level
                                        </label>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                            {["No Experience", "6 Months", "1 Year", "2 Years", "3-5 Years", "5-10 Years", "10-15 Years", "15+ Years"].map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => updateEntry(currentSvcId, 'experience', val)}
                                                    className={cn(
                                                        "px-3 py-4 rounded-[22px] border-2 text-[14px] font-black transition-all",
                                                        currentEntry.experience === val ? "bg-[#E6F6F2] text-[#00A082] border-[#00A082]" : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200"
                                                    )}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>

                                    {/* Skills - Emerges after Experience */}
                                    <AnimatePresence>
                                        {currentEntry.experience !== '' && (
                                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4 pt-2">
                                                <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">2</div>
                                                    Key Skills
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {(SERVICE_SKILLS_SUGGESTIONS[currentSvcId] || []).map(sug => {
                                                        const isAdded = currentEntry.skills.includes(sug);
                                                        return (
                                                            <button
                                                                key={sug}
                                                                onClick={() => isAdded ? removeSkill(currentSvcId, sug) : addSkill(currentSvcId, sug)}
                                                                className={cn(
                                                                    "px-4 py-2 rounded-[16px] text-[13px] font-black transition-all flex items-center gap-1.5 border-2",
                                                                    isAdded ? "bg-[#E6F6F2] text-[#00A082] border-[#00A082]" : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200"
                                                                )}
                                                            >
                                                                {isAdded ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />}
                                                                {sug}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-2 bg-white border-2 border-neutral-100 rounded-[22px] pl-5 pr-2 py-2 focus-within:border-[#00A082] transition-colors">
                                                    <input type="text" placeholder="Custom skill..." value={skillSearch} onChange={e => setSkillSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && skillSearch.trim()) { e.preventDefault(); addSkill(currentSvcId, skillSearch.trim()); setSkillSearch(''); } }} className="flex-1 bg-transparent outline-none text-[15px] font-medium text-neutral-900 placeholder:text-neutral-400" />
                                                    <button onClick={() => { if (skillSearch.trim()) { addSkill(currentSvcId, skillSearch.trim()); setSkillSearch(''); } }} className="px-5 py-3 bg-[#00A082] text-white rounded-[18px] text-[13px] font-black hover:bg-[#008C74] active:scale-95 transition-all">Add</button>
                                                </div>
                                                {currentEntry.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentEntry.skills.map(sk => (
                                                            <span key={sk} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00A082]/10 text-[#00A082] rounded-[10px] text-[12px] font-bold">
                                                                {sk}<button onClick={() => removeSkill(currentSvcId, sk)}><X size={11} strokeWidth={3} /></button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Equipment - Emerges after Skills */}
                                    <AnimatePresence>
                                        {currentEntry.skills.length > 0 && (
                                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">3</div>
                                                        Equipment
                                                    </label>
                                                    <button onClick={() => { updateEntry(currentSvcId, 'noEquipment', !currentEntry.noEquipment); if (!currentEntry.noEquipment) updateEntry(currentSvcId, 'equipments', []); }} className={cn("text-[12px] font-bold px-4 py-1.5 rounded-full border-2 transition-all", currentEntry.noEquipment ? "bg-[#FFF9E6] text-[#FFB11F] border-[#FFC244]" : "bg-white text-neutral-400 border-neutral-100")}>{currentEntry.noEquipment ? "✓ No tools required" : "I don't have tools"}</button>
                                                </div>
                                                {!currentEntry.noEquipment && (
                                                    <div className="space-y-4">
                                                        <div className="flex flex-wrap gap-2">
                                                            {(SERVICE_EQUIPMENT_SUGGESTIONS[currentSvcId] || []).map(eq => {
                                                                const isAdded = currentEntry.equipments.includes(eq);
                                                                return (
                                                                    <button key={eq} onClick={() => isAdded ? removeEquipment(currentSvcId, eq) : addEquipment(currentSvcId, eq)} className={cn("px-4 py-3 rounded-[18px] border-2 text-[13px] font-black transition-all flex items-center gap-1.5", isAdded ? "bg-[#E6F6F2] border-[#00A082] text-[#00A082]" : "bg-white text-neutral-800 border-neutral-100")}>
                                                                        {isAdded && <Check size={12} strokeWidth={3} />}{eq}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-white border-2 border-neutral-100 rounded-[22px] pl-5 pr-2 py-2 focus-within:border-[#00A082] transition-colors">
                                                            <input type="text" placeholder="Custom equipment..." value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && equipmentSearch.trim()) { e.preventDefault(); addEquipment(currentSvcId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="flex-1 bg-transparent outline-none text-[15px] font-medium text-neutral-900 placeholder:text-neutral-400" />
                                                            <button onClick={() => { if (equipmentSearch.trim()) { addEquipment(currentSvcId, equipmentSearch.trim()); setEquipmentSearch(''); } }} className="px-5 py-3 bg-[#00A082] text-white rounded-[18px] text-[13px] font-black hover:bg-[#008C74] active:scale-95 transition-all">Add</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Hourly Rate - Emerges after Equipment */}
                                    <AnimatePresence>
                                        {(currentEntry.noEquipment || currentEntry.equipments.length > 0) && (
                                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4 pt-2">
                                                <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">4</div>
                                                    Hourly Rate
                                                </label>
                                                <div className="bg-neutral-50 rounded-[28px] p-8 space-y-6">
                                                    <div className="flex items-center justify-center gap-6">
                                                        <button onClick={() => updateEntry(currentSvcId, 'hourlyRate', Math.max(50, (currentEntry?.hourlyRate || 100) - 10))} className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#FFC244] transition-all text-neutral-400 hover:text-black"><Minus size={24} strokeWidth={3} /></button>
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-5xl font-black text-neutral-900 tracking-tighter">{currentEntry?.hourlyRate || 100}</span>
                                                                <span className="text-[15px] font-bold text-neutral-400">MAD/hr</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => updateEntry(currentSvcId, 'hourlyRate', (currentEntry?.hourlyRate || 100) + 10)} className="w-14 h-14 rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center hover:border-[#FFC244] transition-all text-neutral-400 hover:text-black"><Plus size={24} strokeWidth={3} /></button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Quick Pitch - Emerges after Rate */}
                                    <AnimatePresence>
                                        {currentEntry.hourlyRate > 0 && (
                                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[14px] font-bold text-neutral-900 flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-[#00A082] text-white flex items-center justify-center text-[10px] font-black">5</div>
                                                        Bio / Pitch
                                                    </label>
                                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                            <circle cx="24" cy="24" r="20" className="fill-none stroke-neutral-100" strokeWidth="3" />
                                                            <circle cx="24" cy="24" r="20" className="fill-none stroke-[#00A082] transition-all duration-500" strokeWidth="3" strokeDasharray={126} strokeDashoffset={126 - (Math.min(pitchLen, MIN_PITCH_CHARS) / MIN_PITCH_CHARS) * 126} strokeLinecap="round" />
                                                        </svg>
                                                        <span className={cn("text-[11px] font-black z-10", pitchLen >= MIN_PITCH_CHARS ? "text-[#00A082]" : "text-neutral-400")}>{pitchLen}</span>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={currentEntry?.pitch || ''}
                                                    onChange={e => updateEntry(currentSvcId, 'pitch', e.target.value)}
                                                    placeholder={`Why should clients pick you for ${currentSvc.name}?`}
                                                    rows={5}
                                                    className={cn(
                                                        "w-full px-7 py-6 bg-white border-2 rounded-[32px] text-[17px] font-medium text-neutral-900 outline-none transition-all",
                                                        pitchLen >= MIN_PITCH_CHARS ? "border-[#008C74] bg-[#E6F6F2]/30" : "border-neutral-100 focus:border-[#FFC244]"
                                                    )}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* ── STEP: Availability ── */}
                            {step === 'availability' && (
                                <motion.div key="availability" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="p-6 md:p-10 space-y-8">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">Your Availability</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">Define times when you want to receive jobs during the day.</p>
                                    </div>

                                    <div className="space-y-4">
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                            <div key={day} className="bg-neutral-50 p-6 rounded-[28px] border border-neutral-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[17px] font-black text-neutral-900">{day}</span>
                                                    <button
                                                        onClick={() => setAvailability(prev => ({ ...prev, [day]: prev[day].length > 0 ? [] : [{ from: '09:00', to: '18:00' }] }))}
                                                        className={cn("px-4 py-1.5 rounded-full text-[12px] font-black transition-all", availability[day].length > 0 ? "bg-[#00A082] text-white" : "bg-neutral-200 text-neutral-500")}
                                                    >
                                                        {availability[day].length > 0 ? 'Active' : 'Off'}
                                                    </button>
                                                </div>
                                                {availability[day].map((slot, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <input type="time" value={slot.from} onChange={e => {
                                                            const newSlots = [...availability[day]];
                                                            newSlots[idx].from = e.target.value;
                                                            setAvailability(prev => ({ ...prev, [day]: newSlots }));
                                                        }} className="flex-1 px-4 py-3 bg-white border border-neutral-200 rounded-xl font-bold text-neutral-900 outline-none" />
                                                        <span className="text-neutral-300">—</span>
                                                        <input type="time" value={slot.to} onChange={e => {
                                                            const newSlots = [...availability[day]];
                                                            newSlots[idx].to = e.target.value;
                                                            setAvailability(prev => ({ ...prev, [day]: newSlots }));
                                                        }} className="flex-1 px-4 py-3 bg-white border border-neutral-200 rounded-xl font-bold text-neutral-900 outline-none" />
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP: City ── */}
                            {step === 'city' && (
                                <motion.div key="city" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="p-6 md:p-10 space-y-8">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">Your City</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">Where do you provide services?</p>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                        {MOROCCAN_CITIES.map(city => (
                                            <button
                                                key={city}
                                                onClick={() => { setSelectedCity(city); setSelectedAreas([]); }}
                                                className={cn(
                                                    'px-5 py-6 rounded-[28px] border-2 text-[15px] font-black transition-all',
                                                    selectedCity === city ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : 'bg-white text-neutral-900 border-neutral-100 hover:border-neutral-200'
                                                )}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP: Work Areas ── */}
                            {step === 'areas' && (
                                <motion.div key="areas" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="p-6 md:p-10 space-y-8">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">Service Areas</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">Select neighborhoods.</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white border-2 border-neutral-100 rounded-[28px] px-6 py-5 focus-within:border-[#00A082] transition-all">
                                        <Search size={24} className="text-neutral-400" />
                                        <input type="text" placeholder="Search neighborhood..." value={areaSearch} onChange={e => setAreaSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-[17px] font-bold text-neutral-900 placeholder:text-neutral-400 placeholder:font-medium" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
                                        {filteredAreas.map(area => {
                                            const sel = selectedAreas.includes(area);
                                            return (
                                                <button
                                                    key={area}
                                                    onClick={() => setSelectedAreas(prev => sel ? prev.filter(x => x !== area) : [...prev, area])}
                                                    className={cn(
                                                        'flex items-center gap-2 px-5 py-4 rounded-[22px] border-2 text-[14px] font-black text-left transition-all',
                                                        sel ? 'bg-[#E6F6F2] text-[#00A082] border-[#00A082]' : 'bg-white text-neutral-800 border-neutral-100 hover:border-neutral-200'
                                                    )}
                                                >
                                                    {sel && <Check size={16} strokeWidth={4} />}{area}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP: Profile ── */}
                            {step === 'profile' && (
                                <motion.div key="profile" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="p-6 md:p-10 space-y-10">
                                    <div className="space-y-1 text-center">
                                        <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight">Your Profile</h2>
                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed">This is how clients see you.</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-4">
                                        <label className="cursor-pointer group relative">
                                            <div className="w-32 h-32 rounded-full bg-neutral-100 border-4 border-white overflow-hidden flex items-center justify-center group-hover:border-[#FFC244] transition-all">
                                                {profileImagePreview ? <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={32} className="text-neutral-300" />}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">Change</div>
                                            </div>
                                            <div className="absolute bottom-1 right-1 w-10 h-10 bg-[#00A082] rounded-full flex items-center justify-center text-white border-[3px] border-white"><Plus size={20} strokeWidth={3} /></div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                                        </label>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[15px] font-black text-neutral-900 ml-2">Full Name</label>
                                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full legal name" className="w-full px-7 py-5 bg-white border-2 border-neutral-100 rounded-[28px] text-[18px] font-black text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[15px] font-black text-neutral-900 ml-2">National ID (CIN)</label>
                                            <input type="text" value={nidNumber} onChange={e => setNidNumber(e.target.value.toUpperCase())} placeholder="e.g. AB123456" className="w-full px-7 py-5 bg-white border-2 border-neutral-100 rounded-[28px] text-[18px] font-black text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[15px] font-black text-neutral-900 ml-2">WhatsApp Number</label>
                                            <div className="flex items-center gap-3">
                                                <div className="px-6 py-5 bg-neutral-100 rounded-[28px] text-[17px] font-black text-neutral-600">+212</div>
                                                <input type="tel" value={whatsappNumber} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val.startsWith('212')) val = val.slice(3); if (val.startsWith('0')) val = val.slice(1); setWhatsappNumber(val); }} placeholder="6 00 00 00 00" className="flex-1 px-7 py-5 bg-white border-2 border-neutral-100 rounded-[28px] text-[18px] font-black text-neutral-900 outline-none focus:border-[#00A082] transition-all placeholder:font-medium placeholder:text-neutral-400" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP: Sign Up ── */}
                            {step === 'finish' && (
                                <motion.div key="finish" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="p-6 md:p-10 space-y-10 max-w-md mx-auto py-12">
                                    <div className="bg-[#E6F6F2] rounded-[40px] p-10 space-y-8 border-2 border-[#00A082]/10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#00A082]/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-white">
                                                {profileImagePreview ? <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-[#00A082]"><User size={32} /></div>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-[#00A082]">Verified Pro</h3>
                                                    <div className="w-4 h-4 bg-[#FFC244] rounded-full flex items-center justify-center"><Check size={10} className="text-white" strokeWidth={5} /></div>
                                                </div>
                                                <p className="text-[28px] font-black text-neutral-900 tracking-tight leading-tight">{fullName}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-neutral-600 font-bold text-[16px] bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full w-fit"><MapPin size={18} className="text-[#00A082]" />{selectedCity} · {selectedAreas.length} Areas</div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedServices.map(id => {
                                                    const s = ALL_SERVICES.find(sv => sv.id === id);
                                                    const entry = serviceEntries[id];
                                                    return (
                                                        <span
                                                            key={id}
                                                            className={cn(
                                                                "px-5 py-3 rounded-[24px] text-[14px] font-black transition-all flex items-center gap-2",
                                                                s?.name === 'Glass'
                                                                    ? "bg-gradient-to-r from-[#BF953F] to-[#B38728] text-white"
                                                                    : "bg-[#00A082] text-white"
                                                            )}
                                                        >
                                                            <div className="w-2 h-2 rounded-full bg-white/50" />
                                                            {s?.name} · {entry?.hourlyRate} MAD
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-2 text-center">
                                            <h2 className="text-2xl md:text-3xl font-black text-neutral-900 tracking-tight">Ready to Start?</h2>
                                            <p className="text-neutral-500 text-[16px] font-medium leading-relaxed px-4">Connect Google to save your profile.</p>
                                        </div>
                                        <motion.button whileTap={{ scale: 0.98 }} onClick={handleGoogleSignup} disabled={isSubmitting} className="w-full h-[72px] bg-[#00A082] hover:bg-[#008C74] text-white rounded-[28px] text-[19px] font-black flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-60">{isSubmitting ? <div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-[3px] border-white/40 border-t-white rounded-full animate-spin" /><span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{submittingStatus}</span></div> : <div className="flex items-center gap-3"><FaGoogle size={22} /><span>Connect with Google</span></div>}</motion.button>
                                        <p className="text-[13px] text-neutral-400 leading-relaxed text-center font-bold px-4">By proceeding, I agree to the <span className="text-neutral-700 underline underline-offset-4 decoration-[#00A082]/50">Terms</span> and <span className="text-neutral-700 underline underline-offset-4 decoration-[#00A082]/50">Privacy</span>.</p>
                                    </div>
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
                                className="w-full h-[72px] bg-[#00A082] text-white rounded-[28px] text-[19px] font-black flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                {step === 'service_details' && !isLastService ? `Next Service` : step === 'profile' ? 'Save & Finish' : 'Continue'}
                                <ArrowRight size={24} strokeWidth={3} />
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OnboardingPopup;
