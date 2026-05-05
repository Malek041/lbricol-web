"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Check, CreditCard, Calendar, Sparkles, Package,
    TreePine, Waves, PawPrint, ClipboardCheck, ArrowRight,
    Building2, MapPin
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import Image from 'next/image';

interface PostSetupPopupSequenceProps {
    property: any;
    isOpen: boolean;
    onComplete: () => void;
}

const PostSetupPopupSequence: React.FC<PostSetupPopupSequenceProps> = ({ property, isOpen, onComplete }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [checkoutCleaningDate, setCheckoutCleaningDate] = useState('');
    const [deepCleanDate, setDeepCleanDate] = useState('');
    const [stairsCleaningDate, setStairsCleaningDate] = useState('');
    const [restockingDate, setRestockingDate] = useState('');
    const [gardeningDate, setGardeningDate] = useState('');
    const [poolDate, setPoolDate] = useState('');
    const [petsDate, setPetsDate] = useState('');
    const [auditCompleted, setAuditCompleted] = useState(false);

    if (!property) return null;

    const automation = property.automation || {};
    const services = automation.services || [];

    // Define the steps sequence based on selected services
    const stepsSequence = [
        { id: 'payment', title: t({ en: 'Payment Method', fr: 'Moyen de paiement' }) },
        ...(services.includes('cleaning') ? [
            { id: 'checkout_cleaning_date', title: t({ en: 'Checkout Cleaning', fr: 'Nettoyage de fin de séjour' }) },
            { id: 'deep_clean_date', title: t({ en: 'Deep Cleaning', fr: 'Grand nettoyage (Deep Clean)' }) },
            { id: 'stairs_cleaning_date', title: t({ en: 'Stairs Cleaning', fr: 'Nettoyage des escaliers' }) }
        ] : []),
        ...(services.includes('errands') ? [{ id: 'restocking_date', title: t({ en: 'Restocking Start Date', fr: 'Début du réapprovisionnement' }) }] : []),
        ...(services.includes('gardening') ? [{ id: 'gardening_date', title: t({ en: 'Gardening Start Date', fr: 'Début du jardinage' }) }] : []),
        ...(services.includes('pool_cleaning') ? [{ id: 'pool_date', title: t({ en: 'Pool Start Date', fr: 'Début de la piscine' }) }] : []),
        ...(services.includes('pets_care') ? [{ id: 'pets_date', title: t({ en: 'Pets Start Date', fr: 'Début soins animaux' }) }] : []),
        ...(services.includes('errands') ? [{ id: 'stock_audit', title: t({ en: 'Initial Stock Audit', fr: 'Audit initial du stock' }) }] : []),
    ];

    const currentStepData = stepsSequence[step];

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const getNextDate = (date: Date, frequency: string) => {
        const next = new Date(date);
        switch (frequency) {
            case 'weekly': next.setDate(next.getDate() + 7); break;
            case 'biweekly': next.setDate(next.getDate() + 14); break;
            case 'monthly': next.setMonth(next.getMonth() + 1); break;
            case 'quarterly': next.setMonth(next.getMonth() + 3); break;
            default: next.setDate(next.getDate() + 7);
        }
        return next;
    };

    const scheduleRecurring = async (startDateStr: string, frequency: string, type: string, title: string, service: string, time: string) => {
        const planningRef = collection(db, 'properties', property.id, 'Planning');
        let currentDate = new Date(startDateStr);
        const endLimit = new Date();
        endLimit.setMonth(endLimit.getMonth() + 6); // Schedule 6 months ahead

        while (currentDate <= endLimit) {
            const dateStr = currentDate.toISOString().split('T')[0];
            await addDoc(planningRef, {
                type,
                status: 'scheduled',
                date: dateStr,
                time,
                title,
                createdAt: serverTimestamp(),
                service,
                frequency
            });
            currentDate = getNextDate(currentDate, frequency);
        }
    };

    const handleNext = async () => {
        if (step < stepsSequence.length - 1) {
            setStep(step + 1);
        } else {
            setIsSubmitting(true);
            try {
                const propertyRef = doc(db, 'properties', property.id);
                await updateDoc(propertyRef, {
                    'automation.paymentMethod': paymentMethod,
                    'automation.checkoutCleaningStartDate': checkoutCleaningDate || null,
                    'automation.deepCleanStartDate': deepCleanDate || null,
                    'automation.stairsCleaningStartDate': stairsCleaningDate || null,
                    'automation.restockingStartDate': restockingDate || null,
                    'automation.gardeningStartDate': gardeningDate || null,
                    'automation.poolStartDate': poolDate || null,
                    'automation.petsStartDate': petsDate || null,
                    'automation.initialAuditCompleted': auditCompleted,
                    'automation.setupCompletedAt': serverTimestamp()
                });

                const planningRef = collection(db, 'properties', property.id, 'Planning');
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dateStr = tomorrow.toISOString().split('T')[0];

                // Frequencies from property data
                const cleaningFreqs = automation.frequencies || {};
                
                if (checkoutCleaningDate) {
                    await addDoc(planningRef, {
                        type: 'checkout',
                        status: 'scheduled',
                        date: checkoutCleaningDate,
                        time: '11:00',
                        title: t({ en: 'First Checkout Cleaning', fr: 'Premier nettoyage checkout' }),
                        createdAt: serverTimestamp(),
                        service: 'cleaning'
                    });
                }

                if (deepCleanDate) {
                    await scheduleRecurring(
                        deepCleanDate, 
                        cleaningFreqs.deep_cleaning || 'monthly', 
                        'deep_clean', 
                        t({ en: 'Deep Clean', fr: 'Grand nettoyage' }), 
                        'cleaning', 
                        '09:00'
                    );
                }

                if (stairsCleaningDate) {
                    await scheduleRecurring(
                        stairsCleaningDate, 
                        cleaningFreqs.stairs_cleaning || 'weekly', 
                        'stairs_cleaning', 
                        t({ en: 'Stairs Cleaning', fr: 'Nettoyage des escaliers' }), 
                        'cleaning', 
                        '10:00'
                    );
                }

                if (gardeningDate) {
                    await scheduleRecurring(
                        gardeningDate, 
                        automation.gardeningDetails?.frequency || 'weekly', 
                        'gardening', 
                        t({ en: 'Gardening Maintenance', fr: 'Entretien du jardin' }), 
                        'gardening', 
                        '08:00'
                    );
                }

                if (poolDate) {
                    await scheduleRecurring(
                        poolDate, 
                        automation.poolDetails?.frequency || 'weekly', 
                        'pool_cleaning', 
                        t({ en: 'Pool Maintenance', fr: 'Entretien piscine' }), 
                        'pool_cleaning', 
                        '09:00'
                    );
                }

                if (petsDate) {
                    await scheduleRecurring(
                        petsDate, 
                        'daily', // Pets care is usually daily if selected, or use frequency if available
                        'pets_care', 
                        t({ en: 'Pets Care Visit', fr: 'Visite soins animaux' }), 
                        'pets_care', 
                        '10:00'
                    );
                }

                if (services.includes('errands') && auditCompleted) {
                    await addDoc(planningRef, {
                        type: 'stock_audit',
                        status: 'scheduled',
                        date: dateStr,
                        time: '10:00',
                        title: t({ en: 'Initial Stock Audit', fr: 'Audit initial du stock' }),
                        createdAt: serverTimestamp(),
                        service: 'errands'
                    });
                }

                onComplete();
            } catch (err) {
                console.error("Error updating property automation:", err);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const renderHeader = () => (
        <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-[5px] mb-8 border border-neutral-100">
            <div className="relative w-16 h-16 rounded-[5px] overflow-hidden shrink-0 shadow-sm">
                <Image
                    src={property.coverPhoto || property.photos?.[0] || '/Images/placeholder-property.jpg'}
                    alt={property.name}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="flex flex-col min-w-0">
                <h4 className="font-bold text-[17px] text-black truncate">{property.name}</h4>
                <p className="text-[13px] text-neutral-500 font-medium flex items-center gap-1">
                    <MapPin size={12} />
                    <span className="truncate">{property.specs?.address || 'Essaouira, Maroc'}</span>
                </p>
            </div>
        </div>
    );

    const renderStepContent = () => {
        if (!currentStepData) return null;

        const dateExplanation = (
            <p className="text-neutral-400 text-[13px] italic mt-4 bg-neutral-50 p-4 rounded-[5px] border border-dashed border-neutral-200">
                {t({ 
                    en: 'Note: This start date will be used as the base date for all future automated sessions.', 
                    fr: 'Note : Cette date de début servira de base pour toutes les futures sessions automatisées.' 
                })}
            </p>
        );

        switch (currentStepData.id) {
            case 'payment':
                return (
                    <div className="space-y-4">
                        <p className="text-neutral-500 text-[15px] mb-6 leading-relaxed">
                            {t({
                                en: 'How would you like to pay for the automated interventions?',
                                fr: 'Comment souhaitez-vous régler les interventions automatisées ?'
                            })}
                        </p>
                        {[
                            { id: 'cash', label: t({ en: 'Cash to Bricoler', fr: 'Espèces au Bricoleur' }), icon: <CreditCard size={24} /> },
                            { id: 'transfer', label: t({ en: 'Bank Transfer', fr: 'Virement Bancaire' }), icon: <CreditCard size={24} /> }
                        ].map((method) => (
                            <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id as any)}
                                className={`w-full flex items-center justify-between p-6 rounded-[5px] border-2 transition-all ${paymentMethod === method.id ? 'border-black bg-black text-white' : 'border-neutral-100 hover:border-black text-black'}`}
                            >
                                <div className="flex items-center gap-4">
                                    {method.icon}
                                    <span className="font-bold text-[17px]">{method.label}</span>
                                </div>
                                {paymentMethod === method.id && <Check size={20} />}
                            </button>
                        ))}
                    </div>
                );

            case 'checkout_cleaning_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <Sparkles size={24} className="text-blue-500" />
                                {t({ en: 'Checkout Cleaning Start', fr: 'Début du nettoyage checkout' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({
                                    en: 'Automated cleaning after every guest departure. Select the first checkout date.',
                                    fr: 'Nettoyage automatisé après chaque départ. Sélectionnez la date du premier checkout.'
                                })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={checkoutCleaningDate}
                            onChange={(e) => setCheckoutCleaningDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                        {dateExplanation}
                    </div>
                );

            case 'deep_clean_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <Sparkles size={24} className="text-purple-500" />
                                {t({ en: 'Deep Cleaning Program', fr: 'Programmer un Grand Nettoyage' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({
                                    en: 'A thorough deep clean of your property. This is a one-time intensive session.',
                                    fr: 'Un nettoyage en profondeur de votre logement. C\'est une session intensive programmée individuellement.'
                                })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={deepCleanDate}
                            onChange={(e) => setDeepCleanDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                    </div>
                );

            case 'stairs_cleaning_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <Building2 size={24} className="text-neutral-600" />
                                {t({ en: 'Stairs Cleaning', fr: 'Nettoyage des escaliers' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({
                                    en: 'Program the maintenance of common areas and stairs.',
                                    fr: 'Programmez l\'entretien des parties communes et des escaliers.'
                                })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={stairsCleaningDate}
                            onChange={(e) => setStairsCleaningDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                        {dateExplanation}
                    </div>
                );

            case 'restocking_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <Package size={24} className="text-orange-500" />
                                {t({ en: 'Restocking Start', fr: 'Début du réapprovisionnement' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({
                                    en: 'When should we start tracking and restocking your supplies?',
                                    fr: 'Quand devons-nous commencer le suivi et le réapprovisionnement de vos fournitures ?'
                                })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={restockingDate}
                            onChange={(e) => setRestockingDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                        {dateExplanation}
                    </div>
                );

            case 'gardening_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <TreePine size={24} className="text-green-500" />
                                {t({ en: 'Gardening Start', fr: 'Début du jardinage' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({ en: 'Select the start date for automated garden maintenance.', fr: 'Sélectionnez la date de début pour l\'entretien automatisé du jardin.' })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={gardeningDate}
                            onChange={(e) => setGardeningDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                        {dateExplanation}
                    </div>
                );

            case 'pool_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <Waves size={24} className="text-cyan-500" />
                                {t({ en: 'Pool Start', fr: 'Début de la piscine' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({ en: 'When should we begin the scheduled pool cleaning?', fr: 'Quand devons-nous commencer le nettoyage programmé de la piscine ?' })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={poolDate}
                            onChange={(e) => setPoolDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                        {dateExplanation}
                    </div>
                );

            case 'pets_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <PawPrint size={24} className="text-amber-600" />
                                {t({ en: 'Pets Care Start', fr: 'Début soins animaux' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({ en: 'Select the date to start automated pet care visits.', fr: 'Sélectionnez la date pour commencer les visites de soins aux animaux.' })}
                            </p>
                        </div>
                        <input
                            type="date"
                            value={petsDate}
                            onChange={(e) => setPetsDate(e.target.value)}
                            className="w-full p-5 rounded-[5px] bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
                        {dateExplanation}
                    </div>
                );

            case 'stock_audit':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-[24px] font-bold text-black flex items-center gap-2">
                                <ClipboardCheck size={28} className="text-[#01A084]" />
                                {t({ en: 'First Stock Audit', fr: 'Premier audit de stock' })}
                            </h3>
                            <div className="p-6 bg-[#01A084]/5 rounded-[5px] border border-[#01A084]/10">
                                <p className="text-[#01A084] text-[16px] leading-relaxed font-medium">
                                    {t({
                                        en: 'To start restocking correctly, Lbricol needs to know your current stock levels. A Bricoler will visit your property tomorrow for an initial audit.',
                                        fr: 'Pour commencer le réapprovisionnement correctement, Lbricol doit connaître vos niveaux de stock actuels. Un Bricoleur visitera votre logement demain pour un audit initial.'
                                    })}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAuditCompleted(true)}
                            className={`w-full flex items-center justify-between p-6 rounded-[5px] border-2 transition-all ${auditCompleted ? 'border-[#01A084] bg-[#01A084] text-white shadow-lg' : 'border-neutral-100 text-black'}`}
                        >
                            <span className="font-bold text-[17px]">{t({ en: 'I understand and agree', fr: 'Je comprends et j\'accepte' })}</span>
                            {auditCompleted && <Check size={24} />}
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-md flex items-end justify-center"
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="bg-white w-full max-w-[600px] rounded-t-[30px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
                    >
                        {/* Progress Bar */}
                        <div className="h-1.5 w-full bg-neutral-100 flex">
                            {stepsSequence.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-full transition-all duration-500 ${i <= step ? 'bg-[#01A084]' : 'bg-neutral-100'}`}
                                    style={{ width: `${100 / stepsSequence.length}%` }}
                                />
                            ))}
                        </div>

                        <div className="p-8 md:p-10 flex-1 overflow-y-auto no-scrollbar">
                            <div className="flex justify-between items-start mb-6">
                                {step > 0 ? (
                                    <button 
                                        onClick={handleBack}
                                        className="p-3 -ml-3 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-all"
                                    >
                                        <ArrowRight size={24} className="rotate-180" />
                                    </button>
                                ) : <div className="w-12" />}
                                
                                <button 
                                    onClick={onComplete}
                                    className="p-3 -mr-3 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-black transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {renderHeader()}

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={step}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -20, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                >
                                    <h2 className="text-[28px] font-bold text-black mb-2 leading-tight">
                                        {currentStepData.title}
                                    </h2>

                                    <div className="mt-8">
                                        {renderStepContent()}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="p-8 md:p-10 pt-4 bg-white border-t border-neutral-50">
                            <button
                                onClick={handleNext}
                                disabled={isSubmitting || (currentStepData.id.includes('date') && !eval(currentStepData.id.split('_')[0] + 'Date')) || (currentStepData.id === 'stock_audit' && !auditCompleted)}
                                className="w-full h-16 bg-[#2C2C2C] text-white rounded-[5px] font-bold text-[18px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {step === stepsSequence.length - 1 ? t({ en: 'Finish Setup', fr: 'Terminer la configuration' }) : t({ en: 'Next', fr: 'Suivant' })}
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PostSetupPopupSequence;
