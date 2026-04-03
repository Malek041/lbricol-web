import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, Bell, ChevronDown, ChevronLeft, ChevronRight, Star, 
    AlertCircle, TrendingUp, Info, User, Tag, Eye, Copy, 
    PenTool, CreditCard, RefreshCw, Send, Trophy, Zap, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import ActivityTab from '@/features/orders/components/ActivityTab';
import AvailabilityTab from '@/features/orders/components/AvailabilityTab';
import ProviderRoutineModal from '@/features/orders/components/ProviderRoutineModal';
import { MobileJobsViewItem } from '@/features/provider/types';

interface PerformanceViewProps {
    performanceTab: 'activity' | 'insights' | 'availability';
    performanceDetail: 'none' | 'operational' | 'financial' | 'reputation' | 'marketing' | 'growth' | 'tips-profile' | 'tips-pricing' | 'tips-stars' | 'tips-visibility' | 'availability';
    setPerformanceDetail: (detail: any) => void;
    performanceScrollRef: React.RefObject<HTMLDivElement | null>;
    userData: any;
    acceptedJobsSorted: any[];
    availableJobs: any[];
    acceptedJobs: any[];
    monthLabel: string;
    showMonthPicker: boolean;
    setShowMonthPicker: (show: boolean) => void;
    selectedMonthDt: Date;
    setSelectedMonthDt: (date: Date) => void;
    monthAvgRating: string | number;
    monthRatings: number[];
    monthJobs: any[];
    monthDoneJobs: any[];
    monthRevenueNum: number;
    completionRate: number;
    mobileNotificationsCount: number;
    setShowNotificationsPage: (show: boolean) => void;
    showToast: (args: any) => void;
    setViewingJobDetails: (job: MobileJobsViewItem | null) => void;
    handleConfirmJob: (job: any) => void;
    handleStatusUpdate: (jobId: string, status: any) => void;
    setRedistributeJob: (job: any) => void;
    setShowRedistributeModal: (show: boolean) => void;
    toMobileItem: (job: any, type: 'market' | 'accepted') => MobileJobsViewItem;
    t: (content: { en: string; fr: string; ar?: string }) => string;
    showRoutineModal: boolean;
    setShowRoutineModal: (show: boolean) => void;
    setUserData: (data: any) => void;
    TIME_SLOTS: string[];
}

export const PerformanceView = ({
    performanceTab,
    performanceDetail,
    setPerformanceDetail,
    performanceScrollRef,
    userData,
    acceptedJobsSorted,
    availableJobs,
    acceptedJobs,
    monthLabel,
    showMonthPicker,
    setShowMonthPicker,
    selectedMonthDt,
    setSelectedMonthDt,
    monthAvgRating,
    monthRatings,
    monthJobs,
    monthDoneJobs,
    monthRevenueNum,
    completionRate,
    mobileNotificationsCount,
    setShowNotificationsPage,
    showToast,
    setViewingJobDetails,
    handleConfirmJob,
    handleStatusUpdate,
    setRedistributeJob,
    setShowRedistributeModal,
    toMobileItem,
    t,
    showRoutineModal,
    setShowRoutineModal,
    setUserData,
    TIME_SLOTS
}: PerformanceViewProps) => {
    const [settlementReceipt, setSettlementReceipt] = React.useState<string | null>(null);
    const [settlementAmount, setSettlementAmount] = React.useState<number>(0);
    const [isSubmittingSettlement, setIsSubmittingSettlement] = React.useState(false);

    return (
        <div ref={performanceScrollRef} className="h-full overflow-y-auto pb-10 no-scrollbar">
            <div className="space-y-6 max-w-4xl mx-auto px-6 pt-10">
                <AnimatePresence mode="wait">
                    {performanceTab === 'activity' && (
                        <motion.div
                            key="performance-activity"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ActivityTab
                                userData={userData}
                                orders={acceptedJobsSorted}
                                onSelect={(order: any) => {
                                    const job = availableJobs.find(j => j.id === order.id);
                                    if (job) {
                                        setViewingJobDetails(toMobileItem(job, 'market'));
                                        return;
                                    }
                                    const accepted = acceptedJobs.find(j => j.id === order.id);
                                    if (accepted) {
                                        setViewingJobDetails(toMobileItem(accepted, 'accepted'));
                                    }
                                }}
                                onShowHistory={() => setShowNotificationsPage(true)}
                                onConfirmJob={handleConfirmJob}
                                onStatusUpdate={handleStatusUpdate}
                                onRedistributeJob={(order: any) => {
                                    const job = acceptedJobs.find(j => j.id === order.id);
                                    if (job) {
                                        setRedistributeJob(job);
                                        setShowRedistributeModal(true);
                                    }
                                }}
                            />
                        </motion.div>
                    )}
                    {performanceTab === 'availability' && (
                        <motion.div
                            key="performance-availability"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            <div className="flex-1 min-h-0 bg-[#FAFAFA] flex flex-col">
                                <AvailabilityTab
                                    userData={userData}
                                    setShowRoutineModal={setShowRoutineModal}
                                />
                            </div>
                            <ProviderRoutineModal
                                isOpen={showRoutineModal}
                                onClose={() => setShowRoutineModal(false)}
                                userData={userData}
                                setUserData={setUserData as any}
                                TIME_SLOTS={TIME_SLOTS}
                            />
                        </motion.div>
                    )}
                    {performanceTab === 'insights' && (
                        <motion.div
                            key="performance-insights"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Insights Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div
                                    className="relative inline-flex items-center gap-3 cursor-pointer group"
                                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                                >
                                    <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-100 group-hover:bg-neutral-100 transition-colors">
                                        <Calendar size={20} className="text-black" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">{t({ en: 'Selected Period', fr: 'Période sélectionnée' })}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[20px] font-black text-black leading-none tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                {monthLabel}
                                            </span>
                                            <motion.div animate={{ rotate: showMonthPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                                <ChevronDown size={18} className="text-black stroke-[2.5px]" />
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowNotificationsPage(true)}
                                    className="w-12 h-12 flex items-center justify-center text-black relative active:scale-90 transition-transform bg-neutral-50 rounded-2xl border border-neutral-100"
                                >
                                    <Bell size={22} strokeWidth={2.5} />
                                    {mobileNotificationsCount > 0 && (
                                        <span className="absolute top-[10px] right-[10px] h-2.5 w-2.5 rounded-full bg-[#E51B24] border-2 border-white" />
                                    )}
                                </button>
                            </div>

                            {(() => {
                                const COMMISSION_RATE = 0.15;

                                // ── All figures are month-scoped via selectedMonthDt ──
                                const referralBonus = (userData as any)?.bricolerReferralBalance || 0;
                                const totalEarnings = monthRevenueNum;
                                const lbricolCommission = Math.round(totalEarnings * COMMISSION_RATE);
                                const netEarnings = totalEarnings - lbricolCommission + referralBonus;

                                // Rating: month-scoped AVG; fallback to all-time
                                const avgRating = monthAvgRating;

                                const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
                                    const count = monthRatings.filter(r => Math.round(r) === star).length;
                                    const pct = monthRatings.length > 0 ? Math.round((count / monthRatings.length) * 100) : 0;
                                    return { star, pct };
                                });

                                const monthTotal = monthJobs.length;
                                const qScore = (Number(avgRating) || 0) / 5; // 0 to 1
                                const rDone = monthDoneJobs.length;
                                const rScore = monthTotal > 0 ? rDone / monthTotal : 0; // 0 to 1
                                const vScore = Math.min(rDone / 4, 1); // Max volume reached at 4 jobs per month

                                // Combined Score: (70% Rating + 30% Reliability) * VolumeFactor
                                const healthScore = Math.round(((qScore * 70) + (rScore * 30)) * vScore);

                                // Profile Strength Meter Calculation
                                const profileCompleteness = (() => {
                                    let score = 0;
                                    const totalPoints = 6;
                                    if (userData?.name) score += 1;
                                    if (userData?.bio && userData.bio.length > 50) score += 1;
                                    if (userData?.profilePhotoURL || userData?.avatar || userData?.photoURL) score += 1;
                                    if ((userData?.services as any)?.length > 0) score += 1;
                                    if (userData?.city) score += 1;
                                    if (userData?.isVerified) score += 1;
                                    return Math.round((score / totalPoints) * 100);
                                })();

                                return (
                                    <div className="space-y-6 max-w-lg mx-auto pb-20 relative">
                                        {/* ── Month Picker Dropdown Overlay ── */}
                                        <AnimatePresence key="performance-month-picker-presence">
                                            {showMonthPicker && (
                                                <motion.div
                                                    key="performance-month-picker"
                                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="absolute inset-x-6 top-0 z-[100] bg-white rounded-2xl border border-neutral-200 overflow-hidden"
                                                >
                                                    {/* Year row */}
                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear() - 1, selectedMonthDt.getMonth(), 1))}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                                                        >
                                                            <ChevronDown style={{ transform: 'rotate(90deg)' }} size={16} />
                                                        </button>
                                                        <span className="text-[16px] font-black text-neutral-900">{selectedMonthDt.getFullYear()}</span>
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear() + 1, selectedMonthDt.getMonth(), 1))}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                                                        >
                                                            <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={16} />
                                                        </button>
                                                    </div>
                                                    {/* Month grid */}
                                                    <div className="grid grid-cols-4 gap-1 p-3">
                                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
                                                            const isSelectedMonth = idx === selectedMonthDt.getMonth();
                                                            const isNowMonth = idx === new Date().getMonth() && selectedMonthDt.getFullYear() === new Date().getFullYear();
                                                            return (
                                                                <button
                                                                    key={m}
                                                                    onClick={() => {
                                                                        setSelectedMonthDt(new Date(selectedMonthDt.getFullYear(), idx, 1));
                                                                        setShowMonthPicker(false);
                                                                    }}
                                                                    className={cn(
                                                                        "py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all",
                                                                        isSelectedMonth ? "bg-[#01A083] text-white" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100",
                                                                        isNowMonth && !isSelectedMonth && "border border-neutral-200"
                                                                    )}
                                                                >
                                                                    {t({ en: m, fr: m })}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        <AnimatePresence mode="wait">
                                            {performanceDetail === 'none' ? (
                                                <motion.div
                                                    key="main-performance"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="space-y-8 pt-4 pb-32"
                                                >
                                                    <div className="space-y-3 pt-4 pb-32 px-5">
                                                        {/* Card 1: Profile Strength Meter */}
                                                        <div className="bg-white border border-[#C5C5C5] rounded-xl p-6 flex items-center gap-6 text-left relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                                            
                                                            {/* Circular Progress */}
                                                            <div className="relative w-20 h-20 flex-shrink-0">
                                                                <svg className="w-full h-full -rotate-90">
                                                                    <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-neutral-100" />
                                                                    <motion.circle 
                                                                        cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                                                        className="text-[#01A083]" 
                                                                        strokeDasharray={2 * Math.PI * 34}
                                                                        initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                                                                        animate={{ strokeDashoffset: (2 * Math.PI * 34) * (1 - profileCompleteness / 100) }}
                                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                                    />
                                                                </svg>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <span className="text-[18px] font-black text-black">{profileCompleteness}%</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex-1">
                                                                <h3 className="text-[16px] font-[950] text-black mb-1">{t({ en: 'Profile Strength', fr: 'Force du Profil' })}</h3>
                                                                <p className="text-[12px] text-neutral-500 font-medium leading-snug">
                                                                    {profileCompleteness === 100 
                                                                        ? t({ en: 'Your profile is perfect. High visibility rank active.', fr: 'Votre profil est parfait. Rang de visibilité maximale actif.' })
                                                                        : t({ en: 'Complete your profile to increase your city ranking.', fr: 'Complétez votre profil pour améliorer votre classement.' })}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Card 2: Performance Alert / Status */}
                                                        <div className="bg-white border border-[#C5C5C5] rounded-lg p-4 flex flex-col items-start text-left">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {healthScore < 80 && <div className="text-[#E51B24]"><AlertCircle size={16} /></div>}
                                                                <h3 className="text-[14px] font-bold text-black">{t({ en: 'Global Performance', fr: 'Performance Globale' })}</h3>
                                                            </div>
                                                            <p className="text-[13px] text-neutral-800 mb-4 leading-relaxed">
                                                                {healthScore >= 90 ? t({ en: 'You are an Elite Bricoler. Your account is performing flawlessly. Keep up the excellent work to maintain top ranking.', fr: 'Vous êtes un Bricoleur Élite. Votre compte est impeccable. Continuez ainsi pour maintenir le meilleur classement.' }) : healthScore >= 70 ? t({ en: 'Your account is active and performing well. Complete more missions to reach Elite status.', fr: 'Votre compte est actif et performant. Réalisez plus de missions pour atteindre le statut Élite.' }) : t({ en: 'Your global performance score needs attention. Complete more missions and maintain excellent client ratings to increase your visibility.', fr: 'Votre score de performance globale nécessite de l\'attention. Réalisez plus de missions avec dexcellentes notes pour augmenter votre visibilité.' })}
                                                            </p>
                                                            <button 
                                                                onClick={() => setPerformanceDetail('operational')}
                                                                className="bg-[#0064e0] text-white text-[13px] font-bold w-full py-2.5 rounded hover:bg-[#0052b8] transition-colors"
                                                            >
                                                                {t({ en: 'View efficiency details', fr: 'Voir les détails d\'efficacité' })}
                                                            </button>
                                                        </div>

                                                        {/* Card 3: Earnings */}
                                                        <div 
                                                            onClick={() => setPerformanceDetail('financial')}
                                                            className="bg-white border border-[#C5C5C5] rounded-lg p-4 flex flex-col justify-center cursor-pointer hover:bg-neutral-50"
                                                        >
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[12px] text-neutral-500 font-medium">{t({ en: 'Total Net Earnings', fr: 'Gains nets totals' })}</span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[12px] text-neutral-500">{t({ en: 'No spending limit', fr: 'Aucune limite de gain' })}</span>
                                                                    <ChevronRight size={14} className="text-neutral-400" />
                                                                </div>
                                                            </div>
                                                            <div className="text-[20px] font-bold text-black mt-1">
                                                                {netEarnings.toFixed(2)} <span className="text-[14px]">MAD</span>
                                                            </div>
                                                        </div>

                                                        {/* Card 4: Score / Rating */}
                                                        <div 
                                                            onClick={() => setPerformanceDetail('reputation')}
                                                            className="bg-white border border-[#C5C5C5] rounded-lg p-4 cursor-pointer hover:bg-neutral-50"
                                                        >
                                                            <div className="flex justify-between items-center w-full mb-4">
                                                                <span className="text-[12px] text-neutral-500 font-medium">{t({ en: 'Opportunity Score', fr: 'Score d\'opportunité' })}</span>
                                                                <ChevronRight size={14} className="text-neutral-400" />
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full border-2 border-neutral-300 flex items-center justify-center -rotate-45 relative">
                                                                        <div className="absolute inset-0 border-b-2 border-l-2 border-neutral-100 rounded-full"></div>
                                                                        <span className="text-[11px] font-bold text-neutral-600 rotate-45">{avgRating || Number(avgRating) || 0.0}</span>
                                                                    </div>
                                                                    <span className="text-[13px] font-medium text-neutral-500">{healthScore} {t({ en: 'points', fr: 'points' })}</span>
                                                                </div>
                                                                <div className="text-[13px] font-medium text-neutral-500">{rDone} {t({ en: 'missions', fr: 'missions' })}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 pt-4">
                                                        <div className="px-6 flex items-center justify-between">
                                                            <h3 className="text-[18px] font-[900] text-black tracking-tight">{t({ en: 'Optimization Tips', fr: 'Conseils d\'optimisation' })}</h3>
                                                        </div>
                                                        <div className="px-4 overflow-x-auto no-scrollbar flex gap-3 pb-4">
                                                            {[
                                                                { id: 'tips-profile', title: t({ en: 'Profile', fr: 'Profil' }), desc: t({ en: 'Get more clicks', fr: 'Plus de clics' }), icon: User },
                                                                { id: 'tips-pricing', title: t({ en: 'Pricing', fr: 'Tarifs' }), desc: t({ en: 'Optimize earnings', fr: 'Gains optimisés' }), icon: Tag },
                                                                { id: 'tips-stars', title: t({ en: '5 Stars', fr: '5 Étoiles' }), desc: t({ en: 'Protocol for success', fr: 'Le succès garanti' }), icon: Star },
                                                                { id: 'tips-visibility', title: t({ en: 'Visibility', fr: 'Visibilité' }), desc: t({ en: 'Rank higher', fr: 'Mieux classé' }), icon: Eye }
                                                            ].map((tip) => (
                                                                <motion.div
                                                                    key={tip.id}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    onClick={() => setPerformanceDetail(tip.id as any)}
                                                                    className="flex-none w-[180px] p-5 bg-neutral-50 rounded-[22px] cursor-pointer border border-neutral-100"
                                                                >
                                                                    <tip.icon size={24} className="text-black mb-10" />
                                                                    <p className="text-[14px] font-[900] text-black leading-tight mb-1">{tip.title}</p>
                                                                    <p className="text-[11px] font-bold text-neutral-400">{tip.desc}</p>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="performance-detail"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="bg-white min-h-[100vh] flex flex-col pt-4 relative"
                                                >
                                                    <div className="px-6 pt-6 pb-2 flex items-center sticky top-0 z-10 bg-white">
                                                        <button
                                                            onClick={() => setPerformanceDetail('none')}
                                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 transition-all hover:scale-105 active:scale-95"
                                                        >
                                                            <ChevronLeft size={24} className="text-neutral-500" />
                                                        </button>
                                                    </div>

                                                    <div className="p-8 pb-40 space-y-10 overflow-y-auto no-scrollbar flex-1">
                                                        {/* FINANCIAL DETAIL */}
                                                        {performanceDetail === 'financial' && (
                                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                {/* TOP CARD: YOUR EARNINGS */}
                                                                <div className="p-8 bg-[#01A083] rounded-[28px] relative overflow-hidden group">
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                                                    <div className="relative z-10">
                                                                        <p className="text-white/60 text-[11px] font-black uppercase tracking-widest mb-2">{t({ en: 'Your earnings', fr: 'Vos gains' })}</p>
                                                                        <div className="flex items-center gap-3">
                                                                            <p className="text-white text-[38px] font-[1000] tracking-tighter">{netEarnings.toFixed(0)} <span className="text-[18px] text-white/40 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                            <div className="px-2 py-1 bg-emerald-500/20 backdrop-blur-md rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{t({ en: 'Net', fr: 'Net' })}</div>
                                                                        </div>
                                                                        <p className="text-white/70 text-[13px] font-bold mt-4 leading-relaxed">
                                                                            {t({
                                                                                en: 'This is the net amount after platform fees based on your completed missions for this period.',
                                                                                fr: 'C\'est le montant net après frais de plateforme basé sur vos missions terminées pour cette période.'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="p-6 rounded-[24px] border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between h-[120px]">
                                                                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Total Gross', fr: 'Brut Total' })}</p>
                                                                        <p className="text-[24px] font-black text-black leading-none">{(totalEarnings).toFixed(0)} <span className="text-[14px] text-neutral-300 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                    </div>
                                                                    <div className="p-6 rounded-[24px] border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between h-[120px]">
                                                                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Referral Bonus', fr: 'Bonus Parrainage' })}</p>
                                                                        <p className="text-[24px] font-black text-[#01A083] leading-none">+{referralBonus} <span className="text-[14px] text-[#01A083]/30 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-4">
                                                                    <div className="p-6 rounded-[24px] border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between h-[100px]">
                                                                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Platform Fee', fr: 'Frais Plateforme' })}</p>
                                                                        <p className="text-[24px] font-black text-red-500 leading-none">-{lbricolCommission} <span className="text-[14px] text-red-200 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                    </div>
                                                                </div>

                                                                <div className="p-7 bg-[#01A083] rounded-[15px] text-white border border-[#008f75] space-y-6 relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                                                    <div className="relative z-10">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Total Due', fr: 'Total dû' })}</p>
                                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded-full">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                                                <span className="text-[10px] font-black text-red-500 uppercase">{t({ en: 'Pending', fr: 'En attente' })}</span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-[36px] font-[1000] tracking-tighter">{lbricolCommission} {t({ en: 'MAD', fr: 'MAD' })}</p>
                                                                    </div>

                                                                    <div className="pt-4 space-y-4 border-t border-white/10 relative z-10">
                                                                        <p className="text-[13px] font-bold text-neutral-300">{t({ en: 'Bank Transfer Details:', fr: 'Détails du virement :' })}</p>
                                                                        <div className="space-y-3 bg-white/5 rounded-xl p-4">
                                                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                                                <span className="text-[11px] font-black text-neutral-500 uppercase">{t({ en: 'Name', fr: 'Nom' })}</span>
                                                                                <span className="text-[14px] font-bold">{t({ en: 'Abdelmalek Tahri', fr: 'Abdelmalek Tahri' })}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                                                <span className="text-[11px] font-black text-neutral-500 uppercase">{t({ en: 'Bank', fr: 'Banque' })}</span>
                                                                                <span className="text-[14px] font-bold">{t({ en: 'Al Barid Bank', fr: 'Al Barid Bank' })}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 items-center">
                                                                                <span className="text-[11px] font-black text-neutral-500 uppercase">RIB</span>
                                                                                <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 group cursor-pointer" onClick={() => { navigator.clipboard.writeText('350810000000000880844466'); alert(t({ en: 'Copied!', fr: 'Copié !' })); }}>
                                                                                    <span className="text-[11px] sm:text-[12px] font-black font-mono tracking-tight text-neutral-200 break-all">350810000000000880844466</span>
                                                                                    <Copy size={12} className="text-neutral-500 flex-shrink-0" />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="pt-2">
                                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const input = document.createElement('input');
                                                                                        input.type = 'file';
                                                                                        input.accept = 'image/*';
                                                                                        input.onchange = (e: any) => {
                                                                                            const file = e.target.files[0];
                                                                                            if (file) {
                                                                                                const reader = new FileReader();
                                                                                                reader.onload = (re) => {
                                                                                                    setSettlementReceipt(re.target?.result as string);
                                                                                                    setSettlementAmount(lbricolCommission);
                                                                                                    showToast({
                                                                                                        variant: 'success',
                                                                                                        title: t({ en: 'Receipt Selected', fr: 'Reçu sélectionné' }),
                                                                                                        description: t({ en: 'Click submit to send for verification.', fr: 'Cliquez sur envoyer pour vérification.' })
                                                                                                    });
                                                                                                };
                                                                                                reader.readAsDataURL(file);
                                                                                            }
                                                                                        };
                                                                                        input.click();
                                                                                    }}
                                                                                    className={cn(
                                                                                        "flex-1 py-4 rounded-xl font-black text-[14px] flex items-center justify-center gap-2 transition-all border-2",
                                                                                        settlementReceipt
                                                                                            ? "bg-white text-black border-white"
                                                                                            : "bg-transparent text-white border-white/20 hover:border-white/40"
                                                                                    )}
                                                                                >
                                                                                    {settlementReceipt ? <PenTool size={18} /> : <CreditCard size={18} />}
                                                                                    {settlementReceipt ? t({ en: 'Modifier', fr: 'Modifier' }) : t({ en: 'Payer cet Hero', fr: 'Payer cet Hero' })}
                                                                                </button>
                                                                                {settlementReceipt && (
                                                                                    <button
                                                                                        disabled={isSubmittingSettlement}
                                                                                        onClick={async () => {
                                                                                            if (!auth.currentUser) return;
                                                                                            setIsSubmittingSettlement(true);
                                                                                            try {
                                                                                                const settlementDoc = await addDoc(collection(db, 'commission_settlements'), {
                                                                                                    bricolerId: auth.currentUser.uid,
                                                                                                    bricolerName: userData?.name || auth.currentUser.displayName || 'Unknown',
                                                                                                    amount: settlementAmount,
                                                                                                    receipt: settlementReceipt,
                                                                                                    status: 'pending',
                                                                                                    month: format(selectedMonthDt, 'yyyy-MM'),
                                                                                                    timestamp: serverTimestamp()
                                                                                                });

                                                                                                await addDoc(collection(db, 'admin_notifications'), {
                                                                                                    type: 'commission_paid',
                                                                                                    settlementId: settlementDoc.id,
                                                                                                    bricolerId: auth.currentUser.uid,
                                                                                                    bricolerName: userData?.name || auth.currentUser.displayName || 'Unknown',
                                                                                                    amount: settlementAmount,
                                                                                                    read: false,
                                                                                                    createdAt: serverTimestamp()
                                                                                                });

                                                                                                setSettlementReceipt(null);
                                                                                                showToast({
                                                                                                    variant: 'success',
                                                                                                    title: t({ en: 'Submission Received!', fr: 'Envoi reçu !' }),
                                                                                                    description: t({ en: 'Admin will verify and update your status within 24h.', fr: 'L\'admin vérifiera et mettra à jour votre statut sous 24h.' })
                                                                                                });
                                                                                            } catch (error) {
                                                                                                console.error('Error submitting settlement:', error);
                                                                                                showToast({ variant: 'error', title: 'Error', description: 'Failed to submit. Please try again.' });
                                                                                            } finally {
                                                                                                setIsSubmittingSettlement(false);
                                                                                            }
                                                                                        }}
                                                                                        className="flex-1 py-4 bg-[#01A083] hover:bg-[#008C74] text-white rounded-xl font-black text-[14px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                                                    >
                                                                                        {isSubmittingSettlement ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                                                                                        {t({ en: 'Envoyer', fr: 'Envoyer' })}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-center text-[10px] text-neutral-500 mt-3 uppercase font-black tracking-widest">{t({ en: 'Verification time: ~24 hours', fr: 'Délai de vérification : ~24 heures' })}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* OPERATIONAL DETAIL */}
                                                        {performanceDetail === 'operational' && (
                                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                <div className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100 relative overflow-hidden group">
                                                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-6">{t({ en: 'Reliability Score', fr: 'Score de Fiabilité' })}</p>
                                                                    <div className="flex items-center justify-between mb-8">
                                                                        <div>
                                                                            <span className="text-[40px] font-[900] leading-none text-black">{Math.round(rScore * 100)}%</span>
                                                                            <div className="flex items-center gap-2 mt-2">
                                                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                                <span className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider">{rScore >= 0.9 ? t({ en: 'High Stability', fr: 'Haute stabilité' }) : t({ en: 'Standard', fr: 'Standard' })}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-14 h-14 rounded-full bg-white border border-neutral-100 flex items-center justify-center">
                                                                            <TrendingUp size={20} className="text-black" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                                            <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} className="h-full bg-[#01A083]" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-4">
                                                                    <div className="p-7 bg-neutral-50 rounded-[32px] border border-neutral-100 flex flex-col justify-between h-[140px]">
                                                                        <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center mb-2">
                                                                            <Check size={18} className="text-emerald-500" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Month Done', fr: 'Terminées ce mois' })}</p>
                                                                            <p className="text-[26px] font-black text-black">{monthDoneJobs.length}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="p-6 bg-neutral-50 rounded-[24px] border border-neutral-100 flex items-center gap-4">
                                                                    <div className="w-10 h-10 bg-white border border-neutral-100 rounded-xl flex items-center justify-center flex-none">
                                                                        <Info size={18} className="text-neutral-400" />
                                                                    </div>
                                                                    <p className="text-[12px] font-medium text-neutral-500 leading-tight">
                                                                        {t({
                                                                            en: 'Cancellations impact your search rank. Keep your rate above 90% for maximum visibility.',
                                                                            fr: 'Les annulations impactent votre classement. Gardez un taux au-dessus de 90% pour une visibilité maximale.'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* REPUTATION DETAIL */}
                                                        {performanceDetail === 'reputation' && (
                                                            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                <div className="flex flex-col items-center text-center py-4">
                                                                    <div className="text-[64px] font-[900] tracking-tighter leading-none text-black mb-2">{Number(avgRating) > 0 ? avgRating : '--'}</div>
                                                                    <div className="flex gap-1.5 mb-4">
                                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                                            <Star key={i} size={24} className={cn(i < Math.floor(Number(avgRating)) ? "text-[#FFC244] fill-[#FFC244]" : "text-neutral-100 fill-neutral-100")} />
                                                                        ))}
                                                                    </div>
                                                                    <div className="px-4 py-1.5 bg-emerald-50 rounded-full text-[12px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">
                                                                        {Number(avgRating) >= 4.5
                                                                            ? t({ en: 'Excellent Quality', fr: 'Qualité excellente' })
                                                                            : t({ en: 'Needs Focus', fr: 'À améliorer' })}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-5 bg-neutral-50 p-8 rounded-[32px] border border-neutral-100">
                                                                    <h4 className="text-[13px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t({ en: 'Rating Distribution', fr: 'Distribution des Notes' })}</h4>
                                                                    {ratingBreakdown.map(rb => (
                                                                        <div key={rb.star} className="flex items-center gap-4">
                                                                            <div className="flex items-center gap-1 w-8">
                                                                                <span className="text-[14px] font-black">{rb.star}</span>
                                                                                <Star size={12} className="text-neutral-300 fill-neutral-300" />
                                                                            </div>
                                                                            <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-neutral-100">
                                                                                <motion.div initial={{ width: 0 }} animate={{ width: `${rb.pct}%` }} className="h-full bg-[#FFC244]" />
                                                                            </div>
                                                                            <span className="text-[12px] font-black text-neutral-400 w-10 text-right">{rb.pct}%</span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <div className="p-6 bg-white border border-neutral-100 rounded-[32px]">
                                                                    <p className="text-[14px] font-bold text-neutral-800 mb-2">{t({ en: 'Recent Reviews', fr: 'Avis Récents' })}</p>
                                                                    <p className="text-[13px] font-medium text-neutral-400 leading-relaxed italic">
                                                                        &quot;{monthRatings.length > 0 ? t({ en: 'You have solid feedback from your clients this month.', fr: 'Vous avez de bons retours de vos clients ce mois-ci.' }) : t({ en: 'No reviews yet for this month. Complete more tasks to earn stars!', fr: 'Pas encore d\'avis ce mois-ci. Finalisez plus de tâches pour gagner des étoiles !' })}&quot;
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* MARKETING DETAIL */}
                                                        {performanceDetail === 'marketing' && (
                                                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                <div className="bg-[#01A083] p-8 rounded-[32px] text-white relative overflow-hidden border border-[#008f75]">
                                                                    <h3 className="text-[18px] font-black mb-2">{t({ en: 'Visibility Metrics', fr: 'Indicateurs de visibilité' })}</h3>
                                                                    <p className="text-white/80 text-[13px] font-medium leading-relaxed">
                                                                        {t({ en: 'We are currently calibrating your search performance data. You will soon see exactly how many times your profile appears in search results.', fr: 'Nous calibrons actuellement vos données de performance dans la recherche. Vous verrez bientôt exactement combien de fois votre profil apparaît dans les résultats.' })}
                                                                    </p>
                                                                    <div className="mt-6 flex items-center gap-3 px-3 py-1.5 bg-white rounded-full w-fit">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#01A083]" />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#01A083]">{t({ en: 'BETA Access', fr: 'Accès BÊTA' })}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="p-8 border border-neutral-100 rounded-[32px] space-y-6 bg-neutral-50/50 relative overflow-hidden">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="text-[15px] font-black text-neutral-900">{t({ en: 'Profile Reach', fr: 'Portée du Profil' })}</p>
                                                                            <p className="text-[11px] text-neutral-400 font-black uppercase tracking-widest">{t({ en: 'Last 7 Days', fr: '7 Derniers Jours' })}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[20px] font-black text-[#01A083]">+12.4%</p>
                                                                            <p className="text-[10px] text-neutral-400 font-bold uppercase">{t({ en: 'vs Last Week', fr: 'vs Semaine Dernière' })}</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {/* SVG Sparkline */}
                                                                    <div className="h-24 w-full flex items-end gap-1">
                                                                        {[40, 65, 55, 80, 70, 95, 85].map((val, i) => (
                                                                            <div key={i} className="flex-1 flex flex-col justify-end items-center group h-full">
                                                                                <motion.div 
                                                                                    initial={{ height: 0 }} 
                                                                                    animate={{ height: `${val}%` }} 
                                                                                    transition={{ delay: i * 0.1, duration: 0.8 }}
                                                                                    className="w-full bg-[#01A08320] rounded-t-lg group-hover:bg-[#01A08350] transition-colors relative"
                                                                                >
                                                                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                                                                                        {val}
                                                                                    </div>
                                                                                </motion.div>
                                                                                <div className="mt-2 text-[9px] font-bold text-neutral-300 uppercase">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    <div className="p-4 bg-white rounded-2xl border border-neutral-100 flex items-center justify-between">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 bg-neutral-50 rounded-full flex items-center justify-center text-[#FFC244]">
                                                                                <Trophy size={14} />
                                                                            </div>
                                                                            <span className="text-[12px] font-bold text-neutral-600">{t({ en: 'City Rank: #12', fr: 'Rang Ville : #12' })}</span>
                                                                        </div>
                                                                        <ChevronRight size={14} className="text-neutral-300" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* GROWTH DETAIL */}
                                                        {performanceDetail === 'growth' && (
                                                            <div className="space-y-8">
                                                                <div className="p-8 bg-[#FFC244] rounded-[32px] text-black">
                                                                    <div className="flex items-center gap-4 mb-4">
                                                                        <div className="w-10 h-10 bg-[#01A083] text-white rounded-xl flex items-center justify-center">
                                                                            <Zap size={20} />
                                                                        </div>
                                                                        <h3 className="text-[18px] font-black">{t({ en: 'Unlock Rewards', fr: 'Débloquer des récompenses' })}</h3>
                                                                    </div>
                                                                    <p className="text-[13px] font-bold text-black/60 leading-relaxed mb-8">{t({ en: 'Refer other Bricolers and earn 50 MAD for each one who completes their first mission.', fr: 'Parrainez d’autres Bricoleurs et gagnez 50 MAD pour chacun qui termine sa première mission.' })}</p>
                                                                    <button
                                                                        onClick={() => { setPerformanceDetail('none'); setShowNotificationsPage(true); }}
                                                                        className="w-full py-5 bg-[#01A083] text-white rounded-[20px] text-[14px] font-black border border-[#008f75]"
                                                                    >
                                                                        {t({ en: 'Open Referrals', fr: 'Ouvrir les parrainages' })}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* OPTIMIZATION TIPS DETAIL VIEWS */}
                                                        {performanceDetail === 'tips-profile' && (
                                                            <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                    <User size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" />
                                                                    <div className="text-center z-10 px-6">
                                                                        <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: 'The Magnet Profile', fr: 'Le Profil Aimant' })}</h3>
                                                                        <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Get +35% more client interest', fr: '+35% d\'intérêt client en plus' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-8">
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-[14px] font-black uppercase tracking-widest text-neutral-400">{t({ en: 'Step 1: The Bio Formula', fr: 'Étape 1 : La formule de bio' })}</h4>
                                                                        <p className="text-[15px] font-medium text-neutral-600 leading-relaxed border-l-4 border-[#FFC244] pl-5 bg-neutral-50 p-4 rounded-xl">
                                                                            {t({
                                                                                en: '"I am a [Niche] expert with [Years] exp. I help clients with [Problem A] and [Problem B]. My goal is [Benefit]."',
                                                                                fr: '"Je suis expert en [Niche] avec [Années] d\'exp. J\'aide mes clients pour [Problème A] et [Problème B]."'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-4">
                                                                        <h4 className="text-[14px] font-black uppercase tracking-widest text-neutral-400">{t({ en: 'Step 2: Social Proof', fr: 'Étape 2 : La preuve sociale' })}</h4>
                                                                        <p className="text-[15px] font-medium text-neutral-600 leading-relaxed">
                                                                            {t({ en: 'Adding just 3 high-quality photos of your work increases your trust score by 50%.', fr: 'Ajouter seulement 3 photos de qualité de votre travail augmente votre score de confiance de 50 %.' })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {performanceDetail === 'tips-pricing' && (
                                                            <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                    <Tag size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" />
                                                                    <div className="text-center z-10 px-6">
                                                                        <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: 'Market Legend', fr: 'Légende du Marché' })}</h3>
                                                                        <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Master your unit economics', fr: 'Maîtrisez votre rentabilité' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-6">
                                                                    <div className="p-6 bg-neutral-50 rounded-[28px] border border-neutral-100 flex gap-4">
                                                                        <div className="w-10 h-10 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-none">
                                                                            <TrendingUp size={18} className="text-emerald-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[16px] font-black mb-1">{t({ en: 'Competitive Anchoring', fr: 'Positionnement concurrentiel' })}</h4>
                                                                            <p className="text-[14px] text-neutral-500 leading-relaxed">{t({ en: 'Check similar services in your city. Start 5% lower to build reviews, then scale up once you hit legendary status.', fr: 'Vérifiez les services similaires dans votre ville. Commencez 5 % plus bas pour obtenir des avis, puis augmentez vos tarifs une fois votre statut renforcé.' })}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-6 bg-neutral-50 rounded-[28px] border border-neutral-100 flex gap-4">
                                                                        <div className="w-10 h-10 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-none">
                                                                            <Zap size={18} className="text-orange-600" />
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-[16px] font-black mb-1">{t({ en: 'Add-on Strategy', fr: 'Stratégie d’options complémentaires' })}</h4>
                                                                            <p className="text-[14px] text-neutral-500 leading-relaxed">{t({ en: 'Don’t just sell the main task. Suggest maintenance or extra parts for a higher average ticket.', fr: 'Ne vendez pas seulement la tâche principale. Proposez maintenance ou options supplémentaires pour augmenter le panier moyen.' })}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {performanceDetail === 'tips-stars' && (
                                                            <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                    <Star size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" fill="currentColor" />
                                                                    <div className="text-center z-10 px-6">
                                                                        <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: '5-Star Protocol', fr: 'Protocole 5 Étoiles' })}</h3>
                                                                        <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Building lifelong clients', fr: 'Fidéliser vos clients à vie' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-4">
                                                                    {[
                                                                        { t: t({ en: 'Be Early', fr: 'Soyez en avance' }), d: t({ en: 'Arriving 5 mins early = 4.8 star average.', fr: 'Arriver 5 minutes en avance = moyenne de 4,8 étoiles.' }) },
                                                                        { t: t({ en: 'Clean Up', fr: 'Nettoyez après' }), d: t({ en: 'Never leave tools or dust. The finish is what they remember.', fr: 'Ne laissez jamais d’outils ni de poussière. La finition est ce dont ils se souviennent.' }) },
                                                                        { t: t({ en: 'The Follow Up', fr: 'Le suivi' }), d: t({ en: 'Message 24h later: "Is everything working perfectly?"', fr: 'Envoyez un message 24h plus tard : "Tout fonctionne parfaitement ?"' }) }
                                                                    ].map((item, idx) => (
                                                                        <div key={idx} className="flex items-center gap-4 bg-neutral-50 p-5 rounded-[24px] border border-neutral-100">
                                                                            <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 text-black flex items-center justify-center font-black text-[12px]">{idx + 1}</div>
                                                                            <div>
                                                                                <p className="text-[15px] font-[900]">{item.t}</p>
                                                                                <p className="text-[13px] text-neutral-400 font-bold">{item.d}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {performanceDetail === 'tips-visibility' && (
                                                            <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                    <Eye size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" />
                                                                    <div className="text-center z-10 px-6">
                                                                        <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: 'Ranking Hacker', fr: 'Hacker de Classement' })}</h3>
                                                                        <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Master the algorithm', fr: 'Maîtrisez l\'algorithme' })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100 space-y-5">
                                                                    <h4 className="text-black text-[16px] font-black">{t({ en: 'Top Ranking Factors', fr: 'Facteurs clés de classement' })}</h4>
                                                                    <ul className="space-y-4">
                                                                        <li className="flex items-center gap-4 text-[13px] font-bold text-neutral-600">
                                                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
                                                                                <Check size={16} />
                                                                            </div>
                                                                            {t({ en: 'High completion rate (>90%)', fr: 'Taux d\'achèvement élevé (>90%)' })}
                                                                        </li>
                                                                        <li className="flex items-center gap-4 text-[13px] font-bold text-neutral-600">
                                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
                                                                                <Zap size={16} />
                                                                            </div>
                                                                            {t({ en: 'Response time under 15 mins', fr: 'Temps de réponse inférieur à 15 min' })}
                                                                        </li>
                                                                        <li className="flex items-center gap-4 text-[13px] font-bold text-neutral-600">
                                                                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-none">
                                                                                <TrendingUp size={16} />
                                                                            </div>
                                                                            {t({ en: 'Frequent commission settlements', fr: 'Règlements de commission fréquents' })}
                                                                        </li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
