"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronRight,
    Check,
    LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { FaGoogle } from 'react-icons/fa6';
import { getAllServices, getServiceById, type ServiceConfig } from '@/config/services_config';
import { useToast } from '@/context/ToastContext';

interface OnboardingPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (data: { services: any[], city: string }) => void;
}

interface SelectedService {
    serviceId: string;
    serviceName: string;
    subServices: string[]; // Array of sub-service IDs
}

const ALL_SERVICES = getAllServices();

const MOROCCAN_CITIES = ["Essaouira", "Marrakech", "Casablanca", "Agadir", "Tangier", "Rabat", "Fes"];

const OnboardingPopup = ({ isOpen, onClose, onComplete }: OnboardingPopupProps) => {
    const [isMobile, setIsMobile] = useState(false);
    const { showToast } = useToast();

    React.useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const [step, setStep] = useState<1 | 1.5 | 2 | 3 | 3.5 | 4 | 5>(1);
    const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fr' | null>(null);
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [currentServiceForSubSelection, setCurrentServiceForSubSelection] = useState<ServiceConfig | null>(null);
    const [tempSubServices, setTempSubServices] = useState<string[]>([]);
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedArea, setSelectedArea] = useState<'inside' | 'countryside' | null>(null);
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNext = async () => {
        if (step === 1 && selectedServices.length > 0) {
            setStep(2);
        } else if (step === 1.5 && tempSubServices.length > 0) {
            // Save the service with sub-services
            if (currentServiceForSubSelection) {
                setSelectedServices(prev => [
                    ...prev,
                    {
                        serviceId: currentServiceForSubSelection.id,
                        serviceName: currentServiceForSubSelection.name,
                        subServices: tempSubServices
                    }
                ]);
            }
            setCurrentServiceForSubSelection(null);
            setTempSubServices([]);
            setStep(1);
        } else if (step === 2 && selectedCity) {
            setStep(3);
        } else if (step === 3 && selectedArea) {
            setStep(3.5);
        } else if (step === 3.5 && selectedLanguage) {
            setStep(4);
        } else if (step === 4 && whatsappNumber.length >= 9) {
            setStep(5);
        }
    };

    const getFullCityName = () => {
        if (!selectedCity || !selectedArea) return selectedCity;
        const areaSuffix = selectedArea === 'countryside' ? ' (Countryside)' : ' (Inside)';
        return `${selectedCity}${areaSuffix}`;
    };

    const toggleService = (service: ServiceConfig) => {
        const isSelected = selectedServices.some(s => s.serviceId === service.id);

        if (isSelected) {
            // Remove service
            setSelectedServices(prev => prev.filter(s => s.serviceId !== service.id));
        } else {
            // Check if service has sub-services
            if (service.subServices.length > 0) {
                // Go to sub-service selection
                setCurrentServiceForSubSelection(service);
                setTempSubServices([]);
                setStep(1.5);
            } else {
                // Add service directly (no sub-services)
                setSelectedServices(prev => [
                    ...prev,
                    {
                        serviceId: service.id,
                        serviceName: service.name,
                        subServices: []
                    }
                ]);
            }
        }
    };

    const toggleSubService = (subServiceId: string) => {
        setTempSubServices(prev =>
            prev.includes(subServiceId)
                ? prev.filter(id => id !== subServiceId)
                : [...prev, subServiceId]
        );
    };

    const handleGoogleSignup = async () => {
        const provider = new GoogleAuthProvider();
        setIsSubmitting(true);
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // 1. Save Bricoler Profile
            const fullCity = getFullCityName();
            const bricolerRef = doc(db, 'bricolers', user.uid);

            await setDoc(bricolerRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                avatar: user.photoURL,
                services: selectedServices, // Now stores hierarchical data
                city: fullCity,
                whatsappNumber,
                isBricoler: true,
                isActive: true, // Start as active immediately
                calendarSlots: [],
                stats: {
                    rating: 0,
                    completedJobs: 0,
                    clientHistory: []
                },
                credits: 3, // Initial free credits
                createdAt: new Date().toISOString()
            }, { merge: true });

            // 2. Update City Services (Supply-driven logic)
            const cityRef = doc(db, 'city_services', fullCity);
            const citySnap = await getDoc(cityRef);
            const serviceNames = selectedServices.map(s => s.serviceName);
            const subServiceIds = selectedServices.flatMap(s => s.subServices);

            if (!citySnap.exists()) {
                await setDoc(cityRef, {
                    active_services: serviceNames,
                    active_sub_services: subServiceIds
                });
            } else {
                await updateDoc(cityRef, {
                    active_services: arrayUnion(...serviceNames),
                    active_sub_services: arrayUnion(...subServiceIds)
                });
            }

            onComplete({ services: selectedServices, city: fullCity });
        } catch (error: any) {
            console.error("Signup error:", error);
            if (error.code === 'auth/popup-blocked') {
                showToast({
                    variant: 'error',
                    title: "Login popup was blocked.",
                    description: "Please allow popups for this site."
                });
            } else if (error.code === 'auth/cancelled-popup-request') {
                console.log("Popup request cancelled - likely due to double click.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000] flex justify-center",
                    isMobile ? "items-end p-0" : "items-center p-4"
                )}
                onClick={onClose}
            >
                <motion.div
                    initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: 20 }}
                    animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                    exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={cn(
                        "bg-white w-full overflow-hidden shadow-2xl relative flex flex-col",
                        isMobile ? "rounded-t-[32px] max-h-[95vh]" : "max-w-[900px] max-h-[85vh] rounded-[32px]"
                    )}
                    onClick={e => e.stopPropagation()}
                >
                    {isMobile && (
                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
                    )}
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 left-6 p-2 hover:bg-neutral-100 rounded-full transition-colors z-10"
                    >
                        <X size={20} className="text-neutral-900" />
                    </button>

                    <div className="flex-1 overflow-y-auto p-12 md:p-16">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 text-center">
                                        Which of these best describes what you offer?
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {ALL_SERVICES.map((service) => {
                                            const isSelected = selectedServices.some(s => s.serviceId === service.id);
                                            return (
                                                <button
                                                    key={service.id}
                                                    onClick={() => toggleService(service)}
                                                    className={cn(
                                                        "relative flex flex-col items-start p-6 rounded-xl border-2 transition-all duration-200 text-left gap-4 hover:border-neutral-900",
                                                        isSelected
                                                            ? "border-neutral-900 bg-neutral-50"
                                                            : "border-neutral-200 bg-white"
                                                    )}
                                                >
                                                    <service.icon size={28} className="text-neutral-900" strokeWidth={1.5} />
                                                    <h3 className="font-medium text-neutral-900 text-sm leading-tight">{service.name}</h3>

                                                    {isSelected && (
                                                        <div className="absolute top-4 right-4 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center">
                                                            <Check size={14} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ) : step === 1.5 ? (
                                <motion.div
                                    key="step1.5"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 text-center">
                                        What type of {currentServiceForSubSelection?.name} do you offer?
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {currentServiceForSubSelection?.subServices.map((subService) => {
                                            const isSelected = tempSubServices.includes(subService.id);
                                            return (
                                                <button
                                                    key={subService.id}
                                                    onClick={() => toggleSubService(subService.id)}
                                                    className={cn(
                                                        "relative flex flex-col items-start p-6 rounded-xl border-2 transition-all duration-200 text-left gap-4 hover:border-neutral-900",
                                                        isSelected
                                                            ? "border-neutral-900 bg-neutral-50"
                                                            : "border-neutral-200 bg-white"
                                                    )}
                                                >
                                                    <h3 className="font-medium text-neutral-900 text-sm leading-tight">{subService.name}</h3>

                                                    {isSelected && (
                                                        <div className="absolute top-4 right-4 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center">
                                                            <Check size={14} strokeWidth={3} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ) : step === 2 ? (
                                <motion.div
                                    key="step2"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 text-center">
                                        Where are you located?
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {MOROCCAN_CITIES.map((city) => (
                                            <button
                                                key={city}
                                                onClick={() => {
                                                    setSelectedCity(city);
                                                    setStep(3);
                                                }}
                                                className={cn(
                                                    "px-6 py-4 rounded-xl border-2 font-medium transition-all text-sm",
                                                    selectedCity === city
                                                        ? "border-black bg-neutral-900 text-white"
                                                        : "border-neutral-200 hover:border-neutral-900 text-neutral-900 bg-white"
                                                )}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            ) : step === 3 ? (
                                <motion.div
                                    key="step3"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 text-center">
                                        Where exactly in {selectedCity}?
                                    </h2>

                                    <div className="flex flex-col gap-4 max-w-sm mx-auto">
                                        <button
                                            onClick={() => {
                                                setSelectedArea('inside');
                                                setStep(4);
                                            }}
                                            className={cn(
                                                "p-4 rounded-xl border-2 font-medium transition-all text-base",
                                                selectedArea === 'inside'
                                                    ? "border-black bg-neutral-900 text-white"
                                                    : "border-neutral-200 hover:border-neutral-900 text-neutral-900 bg-white"
                                            )}
                                        >
                                            Inside {selectedCity}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedArea('countryside');
                                                setStep(4);
                                            }}
                                            className={cn(
                                                "p-4 rounded-xl border-2 font-medium transition-all text-base",
                                                selectedArea === 'countryside'
                                                    ? "border-black bg-neutral-900 text-white"
                                                    : "border-neutral-200 hover:border-neutral-900 text-neutral-900 bg-white"
                                            )}
                                        >
                                            In the Countryside
                                        </button>
                                    </div>
                                </motion.div>
                            ) : step === 3.5 ? (
                                <motion.div
                                    key="step3.5"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 text-center">
                                        Choose your preferred language
                                    </h2>
                                    <div className="flex flex-col gap-4 max-w-sm mx-auto">
                                        <button
                                            onClick={() => {
                                                setSelectedLanguage('en');
                                                setStep(4);
                                            }}
                                            className={cn(
                                                "p-4 rounded-xl border-2 font-medium transition-all text-base",
                                                selectedLanguage === 'en'
                                                    ? "border-black bg-neutral-900 text-white"
                                                    : "border-neutral-200 hover:border-neutral-900 text-neutral-900 bg-white"
                                            )}
                                        >
                                            English
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedLanguage('fr');
                                                setStep(4);
                                            }}
                                            className={cn(
                                                "p-4 rounded-xl border-2 font-medium transition-all text-base",
                                                selectedLanguage === 'fr'
                                                    ? "border-black bg-neutral-900 text-white"
                                                    : "border-neutral-200 hover:border-neutral-900 text-neutral-900 bg-white"
                                            )}
                                        >
                                            Français
                                        </button>
                                    </div>
                                </motion.div>
                            ) : step === 4 ? (
                                <motion.div
                                    key="step4"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10"
                                >
                                    <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 text-center">
                                        What is your WhatsApp number?
                                    </h2>

                                    <div className="max-w-sm mx-auto space-y-6">
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{
                                                padding: '12px 18px',
                                                backgroundColor: '#F6F6F6',
                                                borderRadius: '12px',
                                                fontSize: '16px',
                                                fontWeight: 800,
                                                color: '#000',
                                                border: 'none'
                                            }}>
                                                +212
                                            </div>
                                            <input
                                                type="tel"
                                                value={whatsappNumber}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (val.startsWith('212')) val = val.slice(3);
                                                    if (val.startsWith('0')) val = val.slice(1);
                                                    setWhatsappNumber(val);
                                                }}
                                                placeholder="6 00 00 00 00"
                                                style={{
                                                    flex: 1,
                                                    padding: '12px 18px',
                                                    backgroundColor: '#F6F6F6',
                                                    borderRadius: '12px',
                                                    fontSize: '16px',
                                                    fontWeight: 800,
                                                    color: '#000',
                                                    border: 'none',
                                                    outline: 'none'
                                                }}
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-center text-neutral-500 text-sm font-medium">
                                            We'll use this to notify you about new jobs and requests.
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step5"
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    className="space-y-10 max-w-md mx-auto py-12"
                                >
                                    <div className="text-center space-y-4">
                                        <h2 className="text-3xl font-bold text-neutral-900 leading-tight tracking-tight">
                                            Continue with Google
                                        </h2>
                                        <p className="text-neutral-500 font-normal leading-relaxed text-lg">
                                            Sign in to save your profile and start receiving jobs.
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleGoogleSignup}
                                            disabled={isSubmitting}
                                            style={{
                                                width: '100%',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                backgroundColor: '#EEEEEE',
                                                color: '#000000',
                                                fontSize: '16px',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '12px',
                                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                                transition: 'background-color 0.2s ease',
                                                opacity: isSubmitting ? 0.7 : 1
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    border: '2px solid #A0A0A0',
                                                    borderTopColor: '#000000',
                                                    borderRadius: '50%',
                                                    animation: 'spin 0.8s linear infinite'
                                                }} />
                                            ) : (
                                                <>
                                                    <FaGoogle size={18} />
                                                    <span>Continue with Google</span>
                                                </>
                                            )}
                                        </motion.button>

                                        <p className="text-[13px] text-neutral-500 leading-relaxed mt-4">
                                            By continuing, you agree to Lbricol's Terms of Service and acknowledge you've read our Privacy Policy.
                                        </p>
                                    </div>

                                    <style>{`
                                        @keyframes spin {
                                            to { transform: rotate(360deg); }
                                        }
                                    `}</style>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-neutral-200 p-6 md:p-8 flex items-center justify-between bg-white">
                        <button
                            onClick={() => {
                                if (step === 1.5) {
                                    setCurrentServiceForSubSelection(null);
                                    setTempSubServices([]);
                                    setStep(1);
                                } else if (step === 2) {
                                    setStep(1);
                                } else if (step === 3) {
                                    setStep(2);
                                } else if (step === 3.5) {
                                    setStep(3);
                                } else if (step === 4) {
                                    setStep(3.5);
                                } else if (step === 5) {
                                    setStep(4);
                                }
                            }}
                            className={cn(
                                "text-sm font-semibold underline transition-opacity",
                                step === 1 ? "invisible" : "visible hover:text-neutral-600"
                            )}
                        >
                            Back
                        </button>

                        {step < 5 && step !== 2 && step !== 3 && (
                            <button
                                onClick={handleNext}
                                disabled={
                                    step === 1 ? selectedServices.length === 0 :
                                        step === 1.5 ? tempSubServices.length === 0 :
                                            whatsappNumber.length < 9
                                }
                                className="bg-neutral-900 text-white px-8 py-3.5 rounded-lg text-sm font-semibold hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm active:scale-95"
                            >
                                {step === 1.5 ? 'Add Service' : step === 4 ? 'Almost done' : 'Next'}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

export default OnboardingPopup;
