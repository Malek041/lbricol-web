"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, FileText, Search, Filter, Calendar, ExternalLink, ChevronRight } from 'lucide-react';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Settlement {
    id: string;
    bricolerId: string;
    bricolerName: string;
    amount: number;
    receipt: string;
    status: 'pending' | 'approved' | 'declined';
    month: string;
    timestamp: any;
    // Loaded from bricoler doc
    whatsapp?: string;
    services?: string[];
}

interface AdminReceivablesViewProps {
    onBack: () => void;
}

const AdminReceivablesView: React.FC<AdminReceivablesViewProps> = ({ onBack }) => {
    const { t } = useLanguage();
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'commission_settlements'),
            orderBy('timestamp', 'desc')
        );

        const unsub = onSnapshot(q, async (snap) => {
            const raw = snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement));

            // Enrich with bricoler data
            const enriched = await Promise.all(raw.map(async (s) => {
                try {
                    const bDoc = await getDoc(doc(db, 'bricolers', s.bricolerId));
                    if (bDoc.exists()) {
                        const bData = bDoc.data();
                        return {
                            ...s,
                            whatsapp: bData.whatsapp,
                            services: bData.services || (bData.category ? [bData.category] : [])
                        };
                    }
                } catch (e) {
                    console.warn(`Failed to fetch bricoler ${s.bricolerId}:`, e);
                }
                return s;
            }));

            setSettlements(enriched);
            setIsLoading(false);
        });

        return unsub;
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'declined') => {
        setIsProcessing(id);
        try {
            await updateDoc(doc(db, 'commission_settlements', id), {
                status: newStatus,
                processedAt: new Date().toISOString()
            });
            setSelectedSettlement(null);
        } catch (error) {
            console.error('Error updating settlement:', error);
        } finally {
            setIsProcessing(null);
        }
    };

    const formatDateString = (ts: any) => {
        if (!ts) return '';
        try {
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            return format(date, 'dd MMM yyyy, HH:mm');
        } catch { return ''; }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[#F8F9FA] absolute inset-0 z-[1002]">
            {/* Header */}
            <div className="pt-12 px-6 pb-6 bg-white border-b border-neutral-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-12 h-12 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-all border border-neutral-100"
                    >
                        <ArrowLeft size={24} className="text-black" />
                    </button>
                    <div>
                        <h1 className="text-[24px] font-[1000] text-black leading-tight">
                            {t({ en: 'Receivables', fr: 'Recettes', ar: 'المستحقات' })}
                        </h1>
                        <p className="text-[14px] font-bold text-[#00A082]">
                            {settlements.filter(s => s.status === 'pending').length} {t({ en: 'pending verifications', fr: 'vérifications en attente', ar: 'تحققات معلقة' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-[24px] h-32 animate-pulse border border-neutral-100" />
                        ))}
                    </div>
                ) : settlements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50dvh] opacity-30">
                        <FileText size={48} />
                        <p className="mt-4 font-black">No settlements found</p>
                    </div>
                ) : (
                    settlements.map((s) => (
                        <motion.div
                            key={s.id}
                            layoutId={s.id}
                            onClick={() => setSelectedSettlement(s)}
                            className={cn(
                                "bg-white rounded-[24px] p-5 shadow-sm border-2 transition-all cursor-pointer",
                                s.status === 'pending' ? "border-[#008A21]/10 hover:border-[#008A21]/30" : "border-transparent opacity-60"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-[#E6F7F4] flex items-center justify-center text-[#00A082] font-black text-[18px]">
                                        {s.bricolerName[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-black text-[17px] leading-tight">{s.bricolerName}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Calendar size={12} className="text-neutral-300" />
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">{s.month}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-3 py-1.5 rounded-full text-[11px] font-[1000] uppercase tracking-tighter",
                                    s.status === 'pending' ? "bg-orange-100 text-orange-600" :
                                        s.status === 'approved' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                    {t({
                                        en: s.status,
                                        fr: s.status === 'pending' ? 'en attente' : s.status === 'approved' ? 'approuvé' : 'refusé'
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-neutral-300 uppercase tracking-widest">{t({ en: 'Amount Sent', fr: 'Montant envoyé' })}</span>
                                    <span className="text-[20px] font-[1000] text-black">{s.amount} MAD</span>
                                </div>
                                <div className="flex gap-2">
                                    {s.whatsapp && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`https://wa.me/${s.whatsapp}`, '_blank');
                                            }}
                                            className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center"
                                        >
                                            <WhatsAppBrandIcon className="w-6 h-6" />
                                        </button>
                                    )}
                                    <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedSettlement && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1003] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
                    >
                        <motion.div
                            initial={{ y: '100dvh' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100dvh' }}
                            className="bg-white w-full max-w-xl rounded-t-[40px] sm:rounded-[32px] overflow-hidden flex flex-col max-h-[90dvh] overflow-y-auto overscroll-contain"
                        >
                            <div className="p-8 border-b border-neutral-100 flex items-center justify-between shrink-0">
                                <h2 className="text-[24px] font-[1000] text-black">{t({ en: 'Settlement Details', fr: 'Détails du règlement' })}</h2>
                                <button onClick={() => setSelectedSettlement(null)} className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-black">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Bricoler Card */}
                                <div className="bg-[#F8F9FA] rounded-[28px] p-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-3xl bg-[#00A082] flex items-center justify-center text-white font-black text-[24px]">
                                            {selectedSettlement.bricolerName[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-[20px] font-black text-black">{selectedSettlement.bricolerName}</h3>
                                            <p className="text-[14px] font-bold text-[#00A082]">{selectedSettlement.whatsapp}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Month', fr: 'Mois' })}</span>
                                            <span className="text-[16px] font-[1000] text-black">{selectedSettlement.month}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Amount', fr: 'Montant' })}</span>
                                            <span className="text-[20px] font-[1000] text-orange-500">{selectedSettlement.amount} MAD</span>
                                        </div>
                                        <div className="col-span-2 flex flex-col pt-4 border-t border-neutral-200/50">
                                            <span className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Services', fr: 'Services' })}</span>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedSettlement.services?.map((s, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white rounded-lg text-[12px] font-bold text-black border border-neutral-100 shadow-sm">
                                                        {s}
                                                    </span>
                                                )) || <span className="text-[14px] font-medium text-neutral-400">No services listed</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Receipt Image */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[18px] font-black text-black">{t({ en: 'Payment Receipt', fr: 'Reçu de paiement' })}</h3>
                                        <button
                                            onClick={() => window.open(selectedSettlement.receipt, '_blank')}
                                            className="text-[#00A082] text-[13px] font-black flex items-center gap-1"
                                        >
                                            <ExternalLink size={14} /> {t({ en: 'Open Full', fr: 'Agrandir' })}
                                        </button>
                                    </div>
                                    <div className="aspect-[3/4] rounded-[24px] overflow-hidden border border-neutral-100 bg-neutral-100">
                                        <img
                                            src={selectedSettlement.receipt}
                                            alt="Receipt"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-center text-[12px] text-neutral-400 font-medium">
                                        {t({ en: 'Submitted on', fr: 'Envoyé le' })} {formatDateString(selectedSettlement.timestamp)}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            {selectedSettlement.status === 'pending' && (
                                <div className="p-8 border-t border-neutral-100 flex gap-4">
                                    <button
                                        disabled={isProcessing !== null}
                                        onClick={() => handleUpdateStatus(selectedSettlement.id, 'declined')}
                                        className="flex-1 py-5 rounded-[20px] bg-red-50 text-red-500 hover:bg-red-100 font-black text-[15px] transition-all flex items-center justify-center gap-2"
                                    >
                                        <X size={20} strokeWidth={3} />
                                        {t({ en: 'Decline', fr: 'Refuser' })}
                                    </button>
                                    <button
                                        disabled={isProcessing !== null}
                                        onClick={() => handleUpdateStatus(selectedSettlement.id, 'approved')}
                                        className="flex-2 py-5 rounded-[20px] bg-[#00A082] text-white hover:bg-[#008C74] font-black text-[16px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00A082]/20"
                                    >
                                        {isProcessing === selectedSettlement.id ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={22} strokeWidth={3} />
                                                {t({ en: 'Approve & Validate', fr: 'Approuver & Valider' })}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminReceivablesView;
