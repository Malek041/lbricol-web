"use client";

import React, { useMemo } from 'react';
import { Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface AvailabilityTabProps {
    userData: any;
    setShowRoutineModal: (v: boolean) => void;
}

const DEFAULT_ROUTINE: any = {
    monday: { active: true, from: '09:00', to: '18:00' },
    tuesday: { active: true, from: '09:00', to: '18:00' },
    wednesday: { active: true, from: '09:00', to: '18:00' },
    thursday: { active: true, from: '09:00', to: '18:00' },
    friday: { active: true, from: '09:00', to: '18:00' },
    saturday: { active: false, from: '09:00', to: '14:00' },
    sunday: { active: false, from: '09:00', to: '14:00' },
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function AvailabilityTab({
    userData,
    setShowRoutineModal
}: AvailabilityTabProps) {
    const { t } = useLanguage();

    const routine = useMemo(() => {
        const userRoutine = userData?.routine;
        if (userRoutine && typeof userRoutine === 'object' && !Array.isArray(userRoutine)) {
            const merged: any = { ...DEFAULT_ROUTINE };
            DAYS.forEach(day => {
                if (userRoutine[day]) {
                    merged[day] = { ...DEFAULT_ROUTINE[day], ...userRoutine[day] };
                }
            });
            return merged;
        }
        return DEFAULT_ROUTINE;
    }, [userData?.routine]);

    return (
        <div className="flex flex-col bg-[#FFFFFF] h-full p-1 md:p-6">


            <div className="bg-white rounded-[12px] p-4 md:p-6 max-w-[600px] mx-auto w-full">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 w-full">
                    <div>
                        <h3 className="text-[20px] font-black text-black mb-1">
                            {t({ en: 'Weekly Routine', fr: 'Routine hebdomadaire', ar: 'الروتين الأسبوعي' })}
                        </h3>
                        <p className="text-[14px] text-neutral-500 font-medium leading-tight">
                            {t({
                                en: 'Your regular working hours.',
                                fr: 'Vos horaires de travail réguliers.',
                                ar: 'ساعات عملك المنتظمة.'
                            })}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowRoutineModal(true)}
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#01A083] text-white font-black text-[14px] hover:bg-[#01A083]/90 active:scale-95 transition-all w-full md:w-auto justify-center"
                    >
                        <Edit2 size={16} strokeWidth={3} />
                        {t({ en: 'Edit Routine', fr: 'Modifier', ar: 'تعديل الروتين' })}
                    </button>
                </div>

                <div className="space-y-3">
                    {DAYS.map(day => {
                        const dayData = routine[day];
                        const isActive = dayData.active;
                        return (
                            <div
                                key={day}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[10px] border transition-colors gap-3 ${isActive ? 'border-[#01A083]/20 bg-[#FFFFFF]' : 'border-neutral-100 bg-neutral-50/50'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-[#01A083] text-white' : 'bg-neutral-200 text-neutral-400'
                                        }`}>
                                        {isActive ? <CheckCircle size={20} strokeWidth={2.5} /> : <XCircle size={20} strokeWidth={2.5} />}
                                    </div>
                                    <span className={`text-[15px] font-black uppercase tracking-wider ${isActive ? 'text-black' : 'text-neutral-400'
                                        }`}>
                                        {t({
                                            en: day,
                                            fr: day === 'monday' ? 'lundi' :
                                                day === 'tuesday' ? 'mardi' :
                                                    day === 'wednesday' ? 'mercredi' :
                                                        day === 'thursday' ? 'jeudi' :
                                                            day === 'friday' ? 'vendredi' :
                                                                day === 'saturday' ? 'samedi' : 'dimanche',
                                            ar: day === 'monday' ? 'الاثنين' :
                                                day === 'tuesday' ? 'الثلاثاء' :
                                                    day === 'wednesday' ? 'الأربعاء' :
                                                        day === 'thursday' ? 'الخميس' :
                                                            day === 'friday' ? 'الجمعة' :
                                                                day === 'saturday' ? 'السبت' : 'الأحد'
                                        })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 sm:ml-auto ml-[56px]">
                                    {isActive ? (
                                        <>
                                            <div className="px-4 py-2 bg-white rounded-xl border border-neutral-100 text-[14px] font-black text-black">
                                                {dayData.from}
                                            </div>
                                            <span className="text-neutral-400 font-bold">-</span>
                                            <div className="px-4 py-2 bg-white rounded-xl border border-neutral-100 text-[14px] font-black text-black">
                                                {dayData.to}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="px-5 py-2 text-[14px] font-black text-neutral-400 bg-white rounded-xl border border-neutral-100 flex-1 sm:flex-none text-center">
                                            {t({ en: 'Unavailable', fr: 'Indisponible', ar: 'غير متاح' })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
