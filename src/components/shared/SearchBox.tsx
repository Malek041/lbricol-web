"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Clock, DollarSign, ChevronDown, Plus, Minus } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { fluidMobilePx, useIsMobileViewport, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';

interface SearchBoxProps {
    activeTab: 'domestic' | 'go';
    onSubmit?: () => void;
    activeSection?: string | null;
    onSectionChange?: (section: string | null) => void;
    service?: string;
    onServiceChange?: (service: string) => void;
    date?: string;
    onDateChange?: (date: string) => void;
    selectedDates?: string[];
    onDatesChange?: (dates: string[]) => void;
    showExtraDetails?: boolean;
    isProcessing?: boolean;
    isProgramDisabled?: boolean;
    bricolersCount: number;
    onBricolersCountChange: (count: number) => void;
}

const SearchBox = ({
    activeTab,
    onSubmit,
    activeSection = null,
    onSectionChange,
    service = "",
    onServiceChange,
    date = "",
    selectedDates = [],
    onDateChange,
    onDatesChange,
    showExtraDetails,
    isProcessing = false,
    isProgramDisabled = false,
    bricolersCount,
    onBricolersCountChange
}: SearchBoxProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isMobile = useIsMobileViewport(968);
    const mobileTier = useMobileTier();
    const viewportWidth = useViewportWidth();
    const isCompactPhone = isMobile && mobileTier === 'compact';
    const isWidePhone = isMobile && mobileTier === 'wide';

    const mobileHorizontalPadding = `${Math.round(fluidMobilePx(viewportWidth, 12, 16))}px`;
    const mobileSectionPaddingX = `${Math.round(fluidMobilePx(viewportWidth, 12, 18))}px`;
    const mobileSectionPaddingY = `${Math.round(fluidMobilePx(viewportWidth, 12, 20))}px`;
    const mobileValueFontSize = `${Math.round(fluidMobilePx(viewportWidth, 16, 22))}px`;
    const mobileButtonHeight = `${Math.round(fluidMobilePx(viewportWidth, 54, 62))}px`;
    const mobileButtonFontSize = `${Math.round(fluidMobilePx(viewportWidth, 17, 20))}px`;
    const mobileStepperSize = `${Math.round(fluidMobilePx(viewportWidth, 32, 36))}px`;

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F5F5F5' : '#1A1A1A',
        card: theme === 'light' ? '#FFFFFF' : '#1A1A1A'
    };

    const sections = [
        {
            id: 'what',
            label: t({ en: 'What', fr: 'Quoi', ar: 'ماذا' }),
            value: service || (activeTab === 'domestic' ? t({ en: 'Select Service', fr: 'Choisir un service', ar: 'اختر الخدمة' }) : t({ en: 'What to move?', fr: 'Quoi déplacer ?', ar: 'ماذا تريد أن تنقل؟' })),
            flex: 2.2
        },
        {
            id: 'when',
            label: t({ en: 'When', fr: 'Quand', ar: 'متى' }),
            value: (() => {
                if (selectedDates.length === 0) return t({ en: 'Date & time', fr: 'Date et heure', ar: 'التاريخ والوقت' });
                if (selectedDates.length === 1) {
                    const today = new Date();
                    const todayStr = `${today.toLocaleString('default', { month: 'long' })} ${today.getDate()}, ${today.getFullYear()}`;
                    return selectedDates[0] === todayStr ? t({ en: 'Today', fr: "Aujourd'hui", ar: 'اليوم' }) : selectedDates[0];
                }
                return `${selectedDates.length} ${t({ en: 'dates selected', fr: 'dates sélectionnées', ar: 'تواريخ مختارة' })}`;
            })(),
            flex: 2.2
        },
        {
            id: 'quantity',
            label: t({ en: 'How many Bricolers Needed?', fr: 'Combien de Bricolers sont nécessaires?', ar: 'كم عدد الحرفيين المطلوبين؟' }),
            value: `${bricolersCount} ${t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'حمالين' })}`,
            flex: 2.2
        }
    ];



    return (
        <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1440px', // Even wider for heroic impact
            marginTop: isMobile ? '2rem' : '4rem',
            padding: isMobile ? `0 ${mobileHorizontalPadding}` : '0'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: isMobile ? (isCompactPhone ? '0.85rem' : '1rem') : '1.5rem'
            }}>
                {/* Inputs Container */}
                <div style={{
                    flex: isMobile ? 'none' : 6,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    backgroundColor: theme === 'light' ? '#F9F9F9' : '#111111',
                    borderRadius: isMobile ? (isCompactPhone ? '12px' : '14px') : '15px',
                    padding: isMobile ? '0.5rem' : '0.5rem',
                    gap: isMobile ? '0.5rem' : 0,
                    overflow: 'visible',
                }}>
                    {sections.map((section, idx) => (
                        <div
                            key={section.id}
                            onClick={() => onSectionChange?.(section.id)}
                            style={{
                                flex: isMobile ? 'none' : section.flex || 1,
                                padding: isMobile ? `${mobileSectionPaddingY} ${mobileSectionPaddingX}` : '1.25rem 1.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                zIndex: activeSection === section.id ? 2 : 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            {activeSection === section.id && (
                                <motion.div
                                    layoutId="activePill"
                                    style={{
                                        position: 'absolute',
                                        inset: '4px',
                                        backgroundColor: theme === 'light' ? '#ffffffff' : '#222',
                                        borderRadius: '5px',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                                        border: `1px solid ${activeTab === 'go' ? 'rgba(6, 193, 103, 0.4)' : c.border}`,
                                        zIndex: -1
                                    }}
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                            <div style={{ fontSize: isMobile ? (isCompactPhone ? '10px' : '11px') : '11px', fontWeight: 800, color: c.textMuted, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', position: 'relative' }}>
                                {section.label}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                <div style={{
                                    fontSize: isMobile ? mobileValueFontSize : '25px',
                                    fontWeight: 800,
                                    color: service && section.id === 'what' ? (activeTab === 'go' ? '#06C167' : c.text) : (section.id === 'what' && !service ? c.textMuted : c.text),
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {section.value}
                                </div>

                                {section.id === 'quantity' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} onClick={e => e.stopPropagation()}>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => onBricolersCountChange(Math.max(0, bricolersCount - 1))}
                                            style={{ width: isMobile ? mobileStepperSize : '36px', height: isMobile ? mobileStepperSize : '36px', borderRadius: '12px', border: `2px solid ${c.border}`, backgroundColor: theme === 'light' ? '#FFF' : '#222', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', color: c.text, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                                        >
                                            <Minus size={18} strokeWidth={3} />
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => onBricolersCountChange(bricolersCount + 1)}
                                            style={{ width: isMobile ? mobileStepperSize : '36px', height: isMobile ? mobileStepperSize : '36px', borderRadius: '12px', border: `2px solid ${c.border}`, backgroundColor: theme === 'light' ? '#FFF' : '#222', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', color: c.text, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                                        >
                                            <Plus size={18} strokeWidth={3} />
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                            {!isMobile && idx < sections.length - 1 && activeSection !== section.id && activeSection !== sections[idx + 1].id && (
                                <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '25%',
                                    height: '50%',
                                    width: '1px',
                                    backgroundColor: c.border
                                }} />
                            )}
                        </div>
                    ))}

                </div>

                {/* Submit Button */}
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        console.log("Program button clicked - Validating in parent...");
                        onSubmit?.();
                    }}
                    disabled={isProcessing || isProgramDisabled}
                    style={{
                        width: isMobile ? '100%' : '220px',
                        height: isMobile ? mobileButtonHeight : '7rem',
                        backgroundColor: (activeTab === 'go' ? '#06C167' : (theme === 'light' ? '#000000' : '#FFFFFF')),
                        color: (activeTab === 'go' ? '#FFFFFF' : (theme === 'light' ? '#FFFFFF' : '#000000')),
                        borderRadius: isMobile ? (isWidePhone ? '18px' : '16px') : '7px',
                        fontSize: isMobile ? mobileButtonFontSize : '20px',
                        fontWeight: 900,
                        border: 'none',
                        cursor: (isProcessing || isProgramDisabled) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        opacity: (isProcessing || isProgramDisabled) ? 0.3 : 1
                    }}
                >
                    {isProcessing ? t({ en: 'Processing...', fr: 'Traitement...', ar: 'جاري المعالجة...' }) : t({ en: 'Program', fr: 'Programmer', ar: 'برمجة' })}
                </motion.button>
            </div>
        </div>
    );
};

export default SearchBox;
