"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { SERVICES_CATALOGUE, ServiceEntry } from '@/config/services_catalogue';
import { getServiceById } from '@/config/services_config';
import { Star, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { ReviewsScrollingSection } from '@/features/client/components/ReviewsScrollingSection';

interface ServicesHeroSectionProps {
  availableServiceIds?: string[] | null;
  onSelectService?: (serviceId: string, subServiceId?: string) => void;
}

const ServiceCategoryTab = ({ id, label, labelFr, iconPath, isActive, onClick, disabled }: any) => {
    const { language } = useLanguage();
    const displayLabel = language === 'fr' ? labelFr : label;

    return (
        <motion.div
            whileHover={!disabled ? { scale: 1.05 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={onClick}
            className={cn(
                "relative flex-shrink-0 flex flex-col items-center justify-center gap-3 p-4 rounded-[100px] transition-all duration-300 cursor-pointer",
                isActive ? "bg-[#01A083] text-white shadow-lg shadow-[#01A083]/20" : "bg-neutral-50/80 text-neutral-600 hover:bg-neutral-100",
                disabled && "opacity-50 grayscale cursor-not-allowed pointer-events-none"
            )}
            style={{ width: '130px', height: '170px' }}
        >
            <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-transform duration-500",
                isActive ? "scale-110" : ""
            )}>
                <img src={iconPath} alt={displayLabel} className="w-16 h-16 object-contain" />
            </div>
            
            <span className={cn(
                "text-[14px] font-black text-center leading-tight uppercase tracking-tight",
                isActive ? "text-white" : "text-neutral-500"
            )}>
                {displayLabel}
            </span>

            {/* Selection Dot */}
            {isActive && (
                <motion.div
                    layoutId="active-dot"
                    className="absolute -bottom-1 w-2 h-2 rounded-full bg-[#01A083]"
                />
            )}
        </motion.div>
    );
};

const SubServicePill = ({ id, en, fr, isActive, onClick, disabled }: any) => {
    const { language } = useLanguage();
    const label = language === 'fr' ? fr : en;

    return (
        <motion.button
            whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "px-5 py-4 rounded-[20px] text-left transition-all duration-300 flex items-center justify-between group",
                isActive
                    ? "bg-[#01A083] text-white shadow-xl shadow-[#01A083]/20"
                    : "bg-white border-2 border-neutral-100 text-neutral-700 hover:border-[#01A083]/30 hover:bg-neutral-50/50",
                disabled && "opacity-40 grayscale cursor-not-allowed"
            )}
        >
            <span className="text-[15px] font-black tracking-tight">{label}</span>
            <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                isActive ? "bg-white/20" : "bg-neutral-50 group-hover:bg-[#01A083]/10"
            )}>
                <ChevronRight size={18} className={isActive ? "text-white" : "text-neutral-400 group-hover:text-[#01A083]"} />
            </div>
        </motion.button>
    );
};

const ServicesHeroSection = ({ availableServiceIds, onSelectService }: ServicesHeroSectionProps) => {
    const { t, language } = useLanguage();
    const [activeId, setActiveId] = useState<string>('cleaning');
    const [hasManuallySelected, setHasManuallySelected] = useState(false);
    const tabsRef = useRef<HTMLDivElement>(null);

    const activeService = getServiceById(activeId) || SERVICES_CATALOGUE.find(s => s.id === 'cleaning');

    // Auto-scroll logic for tabs (sync with mobile)
    useEffect(() => {
        if (!hasManuallySelected && tabsRef.current) {
            const activeTab = tabsRef.current.querySelector('[data-active="true"]');
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [activeId, hasManuallySelected]);

    return (
        <section className="hidden lg:block relative py-20 overflow-hidden" style={{ backgroundColor: '#FFB700' }}>
            {/* Header for Desktop */}
            <div className="max-w-[1400px] mx-auto px-10 mb-12 flex justify-between items-center relative z-20">
                <div className="flex items-center gap-3">
                    <img src="/Images/map Assets/LocationPin.png" alt="Logo" className="h-10" />
                    <span className="text-[32px] font-black text-[#037B3E] tracking-tighter">Lbricol</span>
                </div>
                <button className="bg-[#037B3E] hover:bg-[#026935] text-white px-8 py-3 rounded-full text-[15px] font-black transition-all shadow-lg shadow-[#037B3E]/20">
                    Become a Bricoler
                </button>
            </div>

            <div className="max-w-[1400px] mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[40px] shadow-2xl shadow-black/10 overflow-hidden min-h-[700px] flex flex-col"
                >
                    {/* Category Tabs Section */}
                    <div className="bg-neutral-50/50 border-b border-neutral-100/50 p-8">
                        <div 
                            ref={tabsRef}
                            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar justify-center"
                        >
                            {SERVICES_CATALOGUE.map((svc) => (
                                <ServiceCategoryTab
                                    key={svc.id}
                                    {...svc}
                                    isActive={activeId === svc.id}
                                    data-active={activeId === svc.id}
                                    onClick={() => {
                                        setActiveId(svc.id);
                                        setHasManuallySelected(true);
                                    }}
                                    disabled={svc.id !== 'cleaning'} // Parity with mobile unclickable
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex flex-1 p-12 gap-12">
                        {/* Left: Info & Bullets */}
                        <div className="w-1/3 flex flex-col gap-8">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeId}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col gap-6"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 bg-neutral-50 rounded-[30px] flex items-center justify-center p-4">
                                            <img src={(activeService as any)?.iconPath} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <div>
                                            <h2 className="text-[32px] font-black text-neutral-900 tracking-tight leading-tight">
                                                {language === 'fr' ? (activeService as any)?.labelFr : (activeService as any)?.label}
                                            </h2>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className="text-[#FFCC02] fill-[#FFCC02]" />)}
                                                </div>
                                                <span className="text-[13px] font-bold text-neutral-400 lowercase">
                                                    {t({ en: 'Top rated service', fr: 'Service le mieux noté' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 mt-4">
                                        {(activeService as any)?.bullets?.map((bullet: any, idx: number) => (
                                            <div key={idx} className="flex gap-4 group">
                                                <div className="mt-1 w-6 h-6 rounded-lg bg-[#01A083]/10 flex-shrink-0 flex items-center justify-center text-[#01A083] transition-colors group-hover:bg-[#01A083] group-hover:text-white">
                                                    <CheckCircle2 size={14} />
                                                </div>
                                                <p className="text-[15px] font-bold text-neutral-500 leading-relaxed group-hover:text-neutral-700 transition-colors">
                                                    {language === 'fr' ? bullet.fr : bullet.en}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            <div className="mt-auto">
                                <ReviewsScrollingSection />
                            </div>
                        </div>

                        {/* Right: Sub-services Grid */}
                        <div className="flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <AnimatePresence mode="popLayout">
                                    {(activeService as any)?.subServices.map((sub: any, idx: number) => (
                                        <motion.div
                                            key={sub.en}
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <SubServicePill
                                                {...sub}
                                                onClick={() => onSelectService?.(activeId, (sub as any).id)}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Decorative Blobs (Eggy Style) */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                }}
                transition={{ duration: 20, repeat: Infinity }}
                className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#FFF2CC] rounded-full blur-[100px] opacity-50 z-0"
            />
            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    rotate: [0, -90, 0],
                }}
                transition={{ duration: 25, repeat: Infinity }}
                className="absolute bottom-[-200px] right-[-200px] w-[700px] h-[700px] bg-[#E3F1EF] rounded-full blur-[100px] opacity-50 z-0"
            />
        </section>
    );
};

export default ServicesHeroSection;
