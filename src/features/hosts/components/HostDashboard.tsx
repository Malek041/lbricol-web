"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const HostDashboard = () => {
    const { t } = useLanguage();
    const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="flex flex-col min-h-screen bg-white pb-32">
            {/* Header */}
            <div className="px-6 pt-16 pb-6">
                <p className="text-[14px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{today}</p>
                <h1 className="text-[32px] font-bold text-black leading-none">Aujourd'hui</h1>
            </div>

            {/* Empty State / Welcome */}
            <div className="px-6 mb-8">
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#FAF9F6] rounded-[32px] p-6 border border-neutral-100 flex flex-col gap-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFB700] flex items-center justify-center text-white shadow-sm">
                            <Zap size={24} fill="white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-[18px]">Bienvenue, Hôte</h3>
                            <p className="text-[14px] text-neutral-500 leading-snug">Vous n'avez pas d'arrivées ou de départs prévus aujourd'hui.</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Quick Actions / Tasks Section */}
            <div className="px-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-[20px] font-bold text-black">Vos réservations</h2>
                    <button className="text-[14px] font-bold text-neutral-900 underline">Tout afficher</button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button className="bg-white border border-neutral-200 p-5 rounded-[24px] flex flex-col gap-3 active:scale-95 transition-all shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Clock size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-[20px] font-black leading-none">0</p>
                            <p className="text-[13px] text-neutral-500 font-medium">{t({ en: 'Checking out', fr: 'Départs', ar: 'المغادرة' })}</p>
                        </div>
                    </button>
                    <button className="bg-white border border-neutral-200 p-5 rounded-[24px] flex flex-col gap-3 active:scale-95 transition-all shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <User size={20} />
                        </div>
                        <div className="text-left">
                            <p className="text-[20px] font-black leading-none">0</p>
                            <p className="text-[13px] text-neutral-500 font-medium">{t({ en: 'Checking in', fr: 'Arrivées', ar: 'الوصول' })}</p>
                        </div>
                    </button>
                </div>

                {/* Bricolers Tracking (Automation) */}
                <div className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-[20px] font-bold text-black">Bricoleurs en mission</h2>
                    </div>
                    <div className="bg-[#F7F7F7] rounded-[28px] p-8 text-center border border-dashed border-neutral-300">
                        <p className="text-neutral-400 text-[14px]">Aucun Bricoleur n'est actuellement en mission pour vos propriétés.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HostDashboard;
