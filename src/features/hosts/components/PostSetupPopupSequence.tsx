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
    const [cleaningDate, setCleaningDate] = useState('');
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
        ...(services.includes('cleaning') ? [{ id: 'cleaning_date', title: t({ en: 'Cleaning Start Date', fr: 'Début du nettoyage' }) }] : []),
        ...(services.includes('errands') ? [{ id: 'restocking_date', title: t({ en: 'Restocking Start Date', fr: 'Début du réapprovisionnement' }) }] : []),
        ...(services.includes('gardening') ? [{ id: 'gardening_date', title: t({ en: 'Gardening Start Date', fr: 'Début du jardinage' }) }] : []),
        ...(services.includes('pool_cleaning') ? [{ id: 'pool_date', title: t({ en: 'Pool Start Date', fr: 'Début de la piscine' }) }] : []),
        ...(services.includes('pets_care') ? [{ id: 'pets_date', title: t({ en: 'Pets Start Date', fr: 'Début soins animaux' }) }] : []),
        ...(services.includes('errands') ? [{ id: 'stock_audit', title: t({ en: 'Initial Stock Audit', fr: 'Audit initial du stock' }) }] : []),
    ];

    const currentStepData = stepsSequence[step];

    const handleNext = async () => {
        if (step < stepsSequence.length - 1) {
            setStep(step + 1);
        } else {
            // Final submission
            setIsSubmitting(true);
            try {
                const propertyRef = doc(db, 'properties', property.id);
                await updateDoc(propertyRef, {
                    'automation.paymentMethod': paymentMethod,
                    'automation.cleaningStartDate': cleaningDate || null,
                    'automation.restockingStartDate': restockingDate || null,
                    'automation.gardeningStartDate': gardeningDate || null,
                    'automation.poolStartDate': poolDate || null,
                    'automation.petsStartDate': petsDate || null,
                    'automation.initialAuditCompleted': auditCompleted,
                    'automation.setupCompletedAt': serverTimestamp()
                });

                // Create initial stock audit job if restocking was selected
                if (services.includes('errands') && auditCompleted) {
                    const planningRef = collection(db, 'properties', property.id, 'Planning');
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const dateStr = tomorrow.toISOString().split('T')[0];

                    await addDoc(planningRef, {
                        type: 'stock_audit',
                        status: 'scheduled',
                        date: dateStr,
                        time: '10:00',
                        title: t({ en: 'Initial Stock Audit', fr: 'Audit initial du stock' }),
                        description: t({ en: 'First visit to inventory all supplies.', fr: 'Première visite pour inventorier toutes les fournitures.' }),
                        createdAt: serverTimestamp(),
                        service: 'errands'
                    });

                    // Also create a global job for visibility if needed
                    await addDoc(collection(db, 'jobs'), {
                        clientId: property.hostId,
                        propertyId: property.id,
                        status: 'new',
                        service: 'errands',
                        subService: 'stock_audit',
                        subServiceDisplayName: t({ en: 'Initial Stock Audit', fr: 'Audit initial du stock' }),
                        address: property.specs?.address || '',
                        date: dateStr,
                        time: "10:00",
                        createdAt: serverTimestamp(),
                        isHostJob: true,
                        isAutoGenerated: true
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
        <div className="flex items-center gap-4 p-5 bg-neutral-50 rounded-3xl mb-8 border border-neutral-100">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
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
                            { id: 'card', label: t({ en: 'Credit Card', fr: 'Carte Bancaire' }), icon: <CreditCard size={24} /> },
                            { id: 'transfer', label: t({ en: 'Bank Transfer', fr: 'Virement Bancaire' }), icon: <CreditCard size={24} /> }
                        ].map((method) => (
                            <button
                                key={method.id}
                                onClick={() => setPaymentMethod(method.id as any)}
                                className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${paymentMethod === method.id ? 'border-black bg-black text-white' : 'border-neutral-100 hover:border-black text-black'}`}
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

            case 'cleaning_date':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-[20px] font-bold text-black flex items-center gap-2">
                                <Sparkles size={24} className="text-blue-500" />
                                {t({ en: 'Cleaning Start', fr: 'Début du nettoyage' })}
                            </h3>
                            <p className="text-neutral-500 text-[15px]">
                                {t({ 
                                    en: 'Select the date when Lbricol should start handling your property cleaning.', 
                                    fr: 'Sélectionnez la date à laquelle Lbricol doit commencer à gérer le nettoyage de votre logement.' 
                                })}
                            </p>
                        </div>
                        <input 
                            type="date" 
                            value={cleaningDate}
                            onChange={(e) => setCleaningDate(e.target.value)}
                            className="w-full p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
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
                            className="w-full p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
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
                            className="w-full p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
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
                            className="w-full p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
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
                            className="w-full p-5 rounded-2xl bg-neutral-50 border-2 border-neutral-100 focus:border-black outline-none font-bold text-[17px]"
                        />
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
                            <div className="p-6 bg-[#01A084]/5 rounded-2xl border border-[#01A084]/10">
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
                            className={`w-full flex items-center justify-between p-6 rounded-2xl border-2 transition-all ${auditCompleted ? 'border-[#01A084] bg-[#01A084] text-white shadow-lg' : 'border-neutral-100 text-black'}`}
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
                    className="fixed inset-0 z-[20000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white w-full max-w-[500px] rounded-[42px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
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
                            {renderHeader()}
                            
                            <h2 className="text-[28px] font-bold text-black mb-2 leading-tight">
                                {currentStepData.title}
                            </h2>
                            
                            <div className="mt-8">
                                {renderStepContent()}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 md:p-10 pt-0 bg-white">
                            <button
                                onClick={handleNext}
                                disabled={isSubmitting || (currentStepData.id.includes('date') && !eval(currentStepData.id.split('_')[0] + 'Date')) || (currentStepData.id === 'stock_audit' && !auditCompleted)}
                                className="w-full h-16 bg-black text-white rounded-2xl font-bold text-[18px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
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
