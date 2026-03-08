import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { cn } from '@/lib/utils';

interface RoutineSettings {
    [day: string]: {
        active: boolean;
        from: string;
        to: string;
    };
}

interface ProviderRoutineModalProps {
    isOpen: boolean;
    onClose: () => void;
    userData: any;
    setUserData: React.Dispatch<React.SetStateAction<any>>;
    TIME_SLOTS: string[];
}

const DEFAULT_ROUTINE: RoutineSettings = {
    monday: { active: true, from: '09:00', to: '18:00' },
    tuesday: { active: true, from: '09:00', to: '18:00' },
    wednesday: { active: true, from: '09:00', to: '18:00' },
    thursday: { active: true, from: '09:00', to: '18:00' },
    friday: { active: true, from: '09:00', to: '18:00' },
    saturday: { active: false, from: '09:00', to: '14:00' },
    sunday: { active: false, from: '09:00', to: '14:00' },
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function ProviderRoutineModal({
    isOpen,
    onClose,
    userData,
    setUserData,
    TIME_SLOTS
}: ProviderRoutineModalProps) {
    const { t, language } = useLanguage();

    const [routine, setRoutine] = useState<RoutineSettings>(() => {
        return userData?.routine || DEFAULT_ROUTINE;
    });

    const handleToggleDay = (day: string) => {
        setRoutine(prev => ({
            ...prev,
            [day]: { ...prev[day], active: !prev[day].active }
        }));
    };

    const handleTimeChange = (day: string, field: 'from' | 'to', value: string) => {
        setRoutine(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const providerId = userData?.uid || userData?.id;
            if (!providerId) {
                console.error("No provider ID found to save routine.");
                onClose();
                return;
            }

            // Update local state for immediate feedback
            setUserData((prev: any) => ({
                ...prev,
                routine
            }));

            // Persist to Firestore
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');
            const providerRef = doc(db, 'bricolers', providerId);
            await updateDoc(providerRef, { routine });

            onClose();
        } catch (error) {
            console.error("Error saving weekly routine:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getDayTranslation = (day: string) => {
        const translations: Record<string, any> = {
            monday: { en: 'Monday', fr: 'Lundi', ar: 'الاثنين' },
            tuesday: { en: 'Tuesday', fr: 'Mardi', ar: 'الثلاثاء' },
            wednesday: { en: 'Wednesday', fr: 'Mercredi', ar: 'الأربعاء' },
            thursday: { en: 'Thursday', fr: 'Jeudi', ar: 'الخميس' },
            friday: { en: 'Friday', fr: 'Vendredi', ar: 'الجمعة' },
            saturday: { en: 'Saturday', fr: 'Samedi', ar: 'السبت' },
            sunday: { en: 'Sunday', fr: 'Dimanche', ar: 'الأحد' }
        };
        return translations[day][language] || translations[day].en;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[5000] bg-[#FAFAFA] flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-white px-6 py-6 border-b border-[#F0F0F0] flex items-center justify-between shadow-sm z-10">
                        <div>
                            <h1 className="text-[24px] font-[1000] text-black leading-tight">
                                {t({ en: 'Weekly Routine', fr: 'Routine hebdomadaire', ar: 'الروتين الأسبوعي' })}
                            </h1>
                            <p className="text-[13px] font-bold text-neutral-400 mt-1">
                                {t({ en: 'Set your regular working hours', fr: 'Définissez vos heures régulières de travail', ar: 'حدد ساعات عملك المعتادة' })}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 active:scale-95 transition-all text-neutral-500"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar pb-32">
                        {DAYS.map((day) => {
                            const active = routine[day].active;
                            return (
                                <div key={day} className={cn(
                                    "bg-white rounded-[20px] p-5 border-2 transition-all",
                                    active ? "border-[#00A082]/20 shadow-sm" : "border-transparent shadow-sm opacity-60"
                                )}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[17px] font-black text-black capitalize">
                                            {getDayTranslation(day)}
                                        </h3>
                                        <button
                                            onClick={() => handleToggleDay(day)}
                                            className={cn(
                                                "w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out flex",
                                                active ? "bg-[#00A082] justify-end" : "bg-neutral-200 justify-start"
                                            )}
                                        >
                                            <motion.div
                                                layout
                                                className="w-5 h-5 bg-white rounded-full shadow-sm"
                                            />
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {active && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden flex items-center gap-3"
                                            >
                                                <div className="flex-1 flex flex-col bg-neutral-50 rounded-xl px-4 py-2 border border-neutral-100">
                                                    <span className="text-[10px] font-black text-neutral-400 uppercase">{t({ en: 'From', fr: 'De', ar: 'من' })}</span>
                                                    <select
                                                        value={routine[day].from}
                                                        onChange={(e) => handleTimeChange(day, 'from', e.target.value)}
                                                        className="bg-transparent text-[15px] font-bold text-black outline-none w-full appearance-none pb-1"
                                                    >
                                                        {TIME_SLOTS.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <span className="text-black font-black">-</span>
                                                <div className="flex-1 flex flex-col bg-neutral-50 rounded-xl px-4 py-2 border border-neutral-100">
                                                    <span className="text-[10px] font-black text-neutral-400 uppercase">{t({ en: 'To', fr: 'À', ar: 'إلى' })}</span>
                                                    <select
                                                        value={routine[day].to}
                                                        onChange={(e) => handleTimeChange(day, 'to', e.target.value)}
                                                        className="bg-transparent text-[15px] font-bold text-black outline-none w-full appearance-none pb-1"
                                                    >
                                                        {TIME_SLOTS.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="bg-white p-6 border-t border-[#F0F0F0] absolute bottom-0 left-0 right-0">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={cn(
                                "w-full py-4 bg-[#00A082] text-white rounded-2xl text-[18px] font-black shadow-lg shadow-[#00A082]/20 active:scale-95 transition-transform",
                                isSaving && "opacity-70 cursor-not-allowed"
                            )}
                        >
                            {isSaving ? t({ en: 'Saving...', fr: 'Enregistrement...', ar: 'جاري الحفظ...' }) : t({ en: 'Save Routine', fr: 'Enregistrer la routine', ar: 'حفظ الروتين' })}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
