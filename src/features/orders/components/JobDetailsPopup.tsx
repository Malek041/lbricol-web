"use client";

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    Clock,
    MapPin,
    User,
    Star,
    Info,
    CheckCircle2,
    XCircle,
    DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useLanguage } from '@/context/LanguageContext';
import { format, parseISO } from 'date-fns';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';

export interface JobDetails {
    id: string;
    service: string;
    clientName: string;
    clientRating: number;
    location: string;
    date: string;
    time: string;
    duration: string;
    price: number;
    status: 'new' | 'accepted' | 'declined' | 'completed' | 'programmed';
    description?: string;
    photos?: string[];
    images?: string[];
    bricolerId?: string;
    bricolerName?: string;
    clientAvatar?: string;
    bricolerWhatsApp?: string;
    clientWhatsApp?: string;
    selectedCar?: any;
    carReturnDate?: string;
    carReturnTime?: string;
    totalPrice?: number;
    movingVehicle?: string;
}

interface JobDetailsPopupProps {
    job: JobDetails | null;
    onClose: () => void;
    onAccept?: (jobId: string) => void;
    onDecline?: (jobId: string) => void;
    isAdmin?: boolean;
    onChat?: (jobId: string, bricolerId: string, bricolerName: string) => void;
}

const JobDetailsPopup: React.FC<JobDetailsPopupProps> = ({ job, onClose, onAccept, onDecline, isAdmin, onChat }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobileViewport(768);
    const { t } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (job) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [job, onClose]);

    const openWhatsApp = (number: string) => {
        if (!number) return;
        const cleanNumber = number.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('212') ? cleanNumber : `212${cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber}`;
        window.open(`https://wa.me/${finalNumber}`, '_blank');
    };

    if (!job) return null;

    const getStatusConfig = (status: JobDetails['status']) => {
        switch (status) {
            case 'new':
                return { color: '#007AFF', bg: '#E5F1FF', icon: Info, label: t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' }) };
            case 'accepted':
                return { color: '#34C759', bg: '#EBF9EE', icon: CheckCircle2, label: t({ en: 'ACCEPTED', fr: 'ACCEPTÉE', ar: 'مقبول' }) };
            case 'programmed':
                return { color: '#34C759', bg: '#EBF9EE', icon: CheckCircle2, label: t({ en: 'PROGRAMMED', fr: 'PROGRAMMÉE', ar: 'مبرمج' }) };
            case 'declined':
                return { color: '#FF3B30', bg: '#FFEBEA', icon: XCircle, label: t({ en: 'DECLINED', fr: 'REFUSÉE', ar: 'مرفوض' }) };
            case 'completed':
                return { color: '#5856D6', bg: '#EEEBFF', icon: CheckCircle2, label: t({ en: 'COMPLETED', fr: 'TERMINÉE', ar: 'مكتمل' }) };
            default:
                return { color: '#8E8E93', bg: '#F2F2F7', icon: Info, label: t({ en: 'UNKNOWN', fr: 'INCONNU', ar: 'غير معروف' }) };
        }
    };

    const statusConfig = getStatusConfig(job.status);
    const StatusIcon = statusConfig.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex justify-center",
                    isMobile ? "items-end p-0" : "items-center p-6"
                )}
            >
                <motion.div
                    ref={popupRef}
                    initial={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
                    animate={isMobile ? { y: 0 } : { scale: 1, y: 0 }}
                    exit={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={cn(
                        "bg-white w-full shadow-2xl relative flex flex-col transition-all overflow-y-auto",
                        isMobile ? "rounded-t-[32px] max-h-[95vh]" : "max-w-[520px] rounded-2xl max-h-[90vh]"
                    )}
                >
                    {isMobile && (
                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
                    )}
                    {/* Close Button */}
                    <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
                        {isAdmin && (
                            <button
                                onClick={() => onChat?.(job.id, job.bricolerId || '', job.bricolerName || 'Bricoler')}
                                className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
                                title={t({ en: 'Chat with Client', fr: 'Chatter avec le client' })}
                            >
                                <WhatsAppBrandIcon className="w-6 h-6" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
                        >
                            <X size={20} className="text-neutral-900" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 pt-0">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-4">
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
                                style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                            >
                                <StatusIcon size={14} strokeWidth={3} />
                                {statusConfig.label}
                            </div>
                        </div>

                        {/* Job Title */}
                        <h2 className="text-3xl font-bold text-neutral-900 mb-6 leading-tight">
                            {job.service}
                        </h2>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-neutral-600 mb-6">
                            {job.service === 'car_rental' && job.date && job.carReturnDate ? (
                                <div className="flex items-center gap-3 bg-neutral-50 px-4 py-3 rounded-xl w-full">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Pickup', fr: 'Départ' })}</span>
                                        <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                                            <span>{format(parseISO(job.date), 'MMM d')}</span>
                                            <span className="opacity-30">|</span>
                                            <span>{job.time?.split('-')[0] || '09:00'}</span>
                                        </div>
                                    </div>
                                    <div className="h-8 w-px bg-neutral-200 mx-2" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Return', fr: 'Retour' })}</span>
                                        <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                                            <span>{format(parseISO(job.carReturnDate), 'MMM d')}</span>
                                            <span className="opacity-30">|</span>
                                            <span>{job.carReturnTime?.split('-')[0] || '09:00'}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        <span className="text-sm font-semibold">{job.date}</span>
                                    </div>
                                    <span className="text-neutral-300">•</span>
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} />
                                        <span className="text-sm font-semibold">{job.time}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Client Info */}
                        <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl mb-6">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center border border-white shadow-sm">
                                {job.clientAvatar ? (
                                    <img src={job.clientAvatar} alt={job.clientName} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={24} className="text-neutral-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-neutral-900 text-base">{job.clientName}</div>
                                <div className="flex items-center gap-1 text-sm">
                                    <Star size={14} fill="#FFC244" stroke="#FFC244" />
                                    <span className="font-semibold text-neutral-900">{job.clientRating.toFixed(1)}</span>
                                    <span className="text-neutral-500 ml-1">{t({ en: '(Client)', fr: '(Client)', ar: '(عميل)' })}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Selected Car Details section */}
                        {job.selectedCar && (
                            <div className="bg-[#F0FBF8] rounded-2xl p-5 border border-[#219178]/20 flex flex-col gap-4 mb-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="text-[12px] font-black text-[#219178] uppercase tracking-wider mb-1">{t({ en: 'Rented Vehicle', fr: 'Véhicule Loué' })}</h4>
                                        <p className="text-[20px] font-black text-black leading-tight">{job.selectedCar.brandName} {job.selectedCar.modelName}</p>
                                    </div>
                                    <div className="w-20 h-14 bg-white rounded-xl flex items-center justify-center p-2 border border-neutral-100 shadow-sm overflow-hidden flex-shrink-0 ml-4">
                                        <img src={job.selectedCar.modelImage || job.selectedCar.image} alt="car" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 pt-2 border-t border-[#219178]/10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{t({ en: 'Daily Rate', fr: 'Prix/Jour' })}</span>
                                        <span className="text-[16px] font-black text-black">{job.selectedCar.pricePerDay || job.selectedCar.price} MAD</span>
                                    </div>
                                    <div className="flex flex-col items-end ml-auto">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{t({ en: 'Total Price', fr: 'Prix Total' })}</span>
                                        <span className="text-[16px] font-black text-[#219178]">
                                            {job.totalPrice || job.price} MAD
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{t({ en: 'Duration', fr: 'Durée' })}</span>
                                        <span className="text-[16px] font-black text-black">
                                            {(() => {
                                                if (job.date && job.carReturnDate) {
                                                    const d = Math.max(1, Math.round((new Date(job.carReturnDate).getTime() - new Date(job.date).getTime()) / 86400000));
                                                    return `${d} ${t({ en: d > 1 ? 'days' : 'day', fr: d > 1 ? 'jours' : 'jour' })}`;
                                                }
                                                return job.duration || '---';
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Moving Vehicle Details section */}
                        {job.movingVehicle && (
                            <div className="bg-[#F0FBF8] rounded-2xl p-5 border border-[#219178]/20 flex flex-col gap-4 mb-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="text-[12px] font-black text-[#219178] uppercase tracking-wider mb-1">{t({ en: 'Requested Transport', fr: 'Transport Demandé' })}</h4>
                                        <p className="text-[20px] font-black text-black leading-tight">
                                           {(() => {
                                               const opts = {
                                                   triporteur: { en: '🛵 Triporteur', fr: '🛵 Triporteur', ar: '🛵 تربورتور' },
                                                   small_van: { en: '🚐 Small Van', fr: '🚐 Petit Van', ar: '🚐 سيارة "برلانكو"' },
                                                   large_van: { en: '🚚 Large Van', fr: '🚚 Grand Van', ar: '🚚 شاحنة فورد ترانزيت' },
                                                   small_truck: { en: '🚛 Small Truck', fr: '🚛 Petit Camion', ar: '🚛 شاحنة صغيرة' },
                                                   large_truck: { en: '🚚 Large Truck', fr: '🚚 Grand Camion', ar: '🚚 شاحنة كبيرة' },
                                                   labor_only: { en: '💪 Labor only', fr: '💪 Main-d’œuvre seule', ar: '💪 يد عاملة فقط' }
                                               };
                                               return t((opts as any)[job.movingVehicle] || { en: job.movingVehicle });
                                           })()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Budget Breakdown */}
                        <div className="mb-6">
                            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                                {t({ en: 'Budget Breakdown', fr: 'Détail du budget', ar: 'تفاصيل الميزانية' })}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-neutral-900">{job.totalPrice || job.price}</span>
                                <span className="text-xl font-semibold text-neutral-500">MAD</span>
                            </div>
                            <div className="text-sm text-neutral-500 mt-1">
                                {(() => {
                                    if (job.service === 'car_rental' && job.date && job.carReturnDate) {
                                        const d = Math.max(1, Math.round((new Date(job.carReturnDate).getTime() - new Date(job.date).getTime()) / 86400000));
                                        return t({ 
                                            en: `For ${d} ${d > 1 ? 'days' : 'day'}`, 
                                            fr: `Pour ${d} ${d > 1 ? 'jours' : 'jour'}`,
                                            ar: `لمدة ${d} ${d > 1 ? 'أيام' : 'يوم'}`
                                        });
                                    }
                                    return t({ en: `For ${job.duration}`, fr: `Pour ${job.duration}`, ar: `لمدة ${job.duration}` });
                                })()}
                            </div>
                        </div>

                        {/* Additional Details */}
                        {job.description && (
                            <div className="mb-6">
                                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                                    {t({ en: 'Additional Details', fr: 'Détails supplémentaires', ar: 'تفاصيل إضافية' })}
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                                    <p className="text-sm text-neutral-700 italic">"{job.description}"</p>

                                    {/* Task Photos */}
                                    {(job.images && job.images.length > 0) && (
                                        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                            {job.images.map((url, idx) => (
                                                <div
                                                    key={idx}
                                                    className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-neutral-100 bg-white"
                                                    onClick={() => window.open(url, '_blank')}
                                                >
                                                    <img src={url} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {job.location && (
                            <div className="flex items-center gap-2 text-neutral-600 mb-6">
                                <MapPin size={16} />
                                <span className="text-sm font-semibold">{job.location}</span>
                            </div>
                        )}

                        {/* Payment Method Section (Refined like Step 3) */}
                        <section className="mb-8 space-y-4">
                            <h3 className="text-[20px] font-black text-black flex items-center gap-3">
                                <span className="p-2 bg-neutral-50 rounded-lg border border-neutral-100 flex items-center justify-center">
                                     <DollarSign size={18} className="text-neutral-900" />
                                </span>
                                {t({ en: 'Payment Method', fr: 'Paiement' })}
                            </h3>
                            
                            <div style={{
                                padding: '20px', borderRadius: 12, border: '2px solid #219178',
                                background: '#F0FDF9', position: 'relative',
                                display: 'flex', gap: 14, alignItems: 'center'
                            }}>
                                <div style={{ fontSize: 28, flexShrink: 0 }}>
                                    {job.clientWhatsApp ? '🏦' : '💵'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900, fontSize: 16, color: '#111827', marginBottom: 2 }}>
                                        {job.clientWhatsApp ? t({ en: 'Bank Transfer', fr: 'Virement Bancaire' }) : t({ en: 'Cash on Delivery', fr: 'Paiement à la livraison' })}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: '#219178' }}>
                                        {job.clientWhatsApp ? t({ en: 'Verified by Receipt', fr: 'Vérifié par Reçu' }) : t({ en: 'Standard payment', fr: 'Paiement standard' })}
                                    </div>
                                </div>
                                <div style={{ width: 22, height: 22, background: '#219178', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle2 size={14} color="#fff" />
                                </div>
                            </div>
                        </section>

                        {/* Summary Section (Wave Style) */}
                        <div className="mt-12 bg-[#F9FAFB] relative -mx-8 px-8 py-10 pb-12">
                            {/* Wave Divider like Step 3 */}
                            <div style={{ position: 'absolute', top: -38, left: 0, right: 0, height: 40, pointerEvents: 'none', zIndex: 1 }}>
                                <div style={{ width: '100%', height: '100%', fill: '#F9FAFB', color: '#F9FAFB' }}>
                                    <svg viewBox="0 0 1440 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                                        <path fill="currentColor" d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z" transform="scaleY(-1) translate(0, -100)"></path>
                                    </svg>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-[24px] font-black text-black">{t({ en: 'Total Summary', fr: 'Résumé Total' })}</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{t({ en: 'Base Fee', fr: 'Frais Base' })}</span>
                                            <span className="text-[15px] font-black text-black">{job.duration || t({ en: 'Flexible', fr: 'Flexible' })}</span>
                                        </div>
                                        <span className="text-[17px] font-black text-black">{job.price} MAD</span>
                                    </div>
                                    
                                    {job.totalPrice && job.totalPrice > job.price && (
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{t({ en: 'Additional Fees', fr: 'Frais Supp.' })}</span>
                                                <span className="text-[15px] font-black text-neutral-500">{t({ en: 'Travel/Vehicle', fr: 'Déplacement/Véhicule' })}</span>
                                            </div>
                                            <span className="text-[17px] font-black text-black">+{job.totalPrice - job.price} MAD</span>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-neutral-200 flex justify-between items-center">
                                        <span className="text-[20px] font-black text-[#219178]">{t({ en: 'Total Amount', fr: 'Montant Total' })}</span>
                                        <span className="text-[26px] font-black text-[#219178] tracking-tighter">{job.totalPrice || job.price} MAD</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* WhatsApp Button for Programmed/Completed Jobs */}
                        {(job.status === 'programmed' || job.status === 'completed' || job.status === 'accepted') && (
                            <div className="mt-8">
                                <button
                                    onClick={() => openWhatsApp(job.bricolerWhatsApp || job.clientWhatsApp || '')}
                                    className="w-full py-5 bg-[#25D366] text-white rounded-2xl font-black text-[17px] hover:bg-[#128C7E] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-[#25D366]/20"
                                >
                                    <WhatsAppBrandIcon size={24} fill="currentColor" />
                                    {t({ en: 'Chat on WhatsApp', fr: 'Parler sur WhatsApp', ar: 'تحدث على واتساب' })}
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {job.status === 'new' && (
                            <div className="space-y-3 mt-8">
                                <button
                                    onClick={() => onAccept?.(job.id)}
                                    className="w-full py-5 bg-neutral-900 text-white rounded-2xl font-bold text-base hover:bg-neutral-800 transition-all active:scale-[0.98]"
                                >
                                    {t({ en: 'Accept Job', fr: 'Accepter la mission', ar: 'قبول المهمة' })}
                                </button>
                                <button
                                    onClick={() => onDecline?.(job.id)}
                                    className="w-full py-5 bg-red-50 text-red-600 rounded-2xl font-bold text-base hover:bg-red-100 transition-all active:scale-[0.98]"
                                >
                                    {t({ en: 'Decline', fr: 'Refuser', ar: 'رفض' })}
                                </button>
                            </div>
                        )}

                        {job.status === 'accepted' && (
                            <div className="space-y-3 mt-4">
                                <button className="w-full py-5 bg-neutral-100 text-neutral-900 rounded-2xl font-bold text-base hover:bg-neutral-200 transition-all active:scale-[0.98]">
                                    {t({ en: 'View in Calendar', fr: 'Voir dans le calendrier', ar: 'عرض في التقويم' })}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default JobDetailsPopup;
