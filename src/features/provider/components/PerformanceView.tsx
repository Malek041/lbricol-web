import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Bell, ChevronDown, ChevronLeft, ChevronRight, Star,
    AlertCircle, TrendingUp, Info, User, Tag, Eye, Copy,
    PenTool, CreditCard, RefreshCw, Send, Trophy, Zap, Check, X, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import ActivityTab from '@/features/orders/components/ActivityTab';
import AvailabilityTab from '@/features/orders/components/AvailabilityTab';
import ProviderRoutineModal from '@/features/orders/components/ProviderRoutineModal';
import { MobileJobsViewItem } from '@/features/provider/types';
import { useRef, useEffect } from 'react';

interface PerformanceViewProps {
    performanceTab: 'activity' | 'performance' | 'availability';
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
    t: (content: any) => string;
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
    const [yearOffset, setYearOffset] = React.useState(0);
    const monthScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (performanceTab === 'performance' && monthScrollRef.current) {
            const selectedBtn = monthScrollRef.current.querySelector('[data-selected="true"]');
            if (selectedBtn) {
                selectedBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [performanceTab, selectedMonthDt]);

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
                    {performanceTab === 'performance' && (
                        <motion.div
                            key="performance-view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-0"
                        >
                            {/* Ultra-Minimal Inline Month Scroll */}
                            {performanceDetail === 'none' && (
                                <div className="bg-white pb-4 border-b border-neutral-100 flex items-center justify-between -mx-6">
                                    <div ref={monthScrollRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar px-6 flex-1">
                                        {Array.from({ length: 12 }).map((_, i) => {
                                            const mDate = new Date(selectedMonthDt.getFullYear() + yearOffset, i, 1);
                                            const isSelected = i === selectedMonthDt.getMonth();
                                            const label = format(mDate, 'MMMM');

                                            return (
                                                <button
                                                    key={i}
                                                    data-selected={isSelected}
                                                    onClick={() => setSelectedMonthDt(mDate)}
                                                    className={cn(
                                                        "flex-shrink-0 px-5 py-2.5 rounded-full text-[14px] font-black transition-all",
                                                        isSelected
                                                            ? "bg-black text-white"
                                                            : "bg-neutral-50 text-neutral-400"
                                                    )}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const COMMISSION_RATE = 0.15;
                                const referralBonus = (userData as any)?.bricolerReferralBalance || 0;
                                const totalEarnings = monthRevenueNum;
                                const lbricolCommission = Math.round(totalEarnings * COMMISSION_RATE);
                                const netEarnings = totalEarnings - lbricolCommission + referralBonus;
                                const avgRating = monthAvgRating;
                                const monthTotal = monthJobs.length;
                                const qScore = (Number(avgRating) || 0) / 5;
                                const rDone = monthDoneJobs.length;
                                const rScore = monthTotal > 0 ? rDone / monthTotal : 0;
                                const vScore = Math.min(rDone / 4, 1);
                                const healthScore = Math.round(((qScore * 70) + (rScore * 30)) * vScore);

                                const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
                                    const count = monthRatings.filter(r => Math.round(r) === star).length;
                                    const pct = monthRatings.length > 0 ? Math.round((count / monthRatings.length) * 100) : 0;
                                    return { star, pct };
                                });

                                return (
                                    <div className="space-y-6 w-full pb-20 relative">
                                        <AnimatePresence mode="wait">
                                            {performanceDetail === 'none' ? (
                                                <motion.div
                                                    key="main-performance"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    <div className="h-0.5 w-full bg-[#F6F7F6]" />
                                                    {/* Welcome banner for new bricolers */}
                                                    {monthTotal === 0 && (
                                                        <div className="bg-white px-6 py-4 pb-4">
                                                            <div className="bg-[#F0FBF8] border border-[#01A083]/20 rounded-2xl px-5 py-4 flex items-start gap-3">
                                                                <Sparkles size={20} className="text-[#01A083] flex-shrink-0 mt-0.5" />
                                                                <p className="text-[13px] text-[#01A083] font-semibold leading-snug">
                                                                    {t({
                                                                        en: 'Complete your first mission to start seeing your stats here.',
                                                                        fr: 'Terminez votre première mission pour voir vos stats ici.',
                                                                        ar: 'أكمل مهمتك الأولى لتبدأ بمشاهدة إحصائياتك هنا.'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Section: Earnings */}
                                                    <div className="bg-white">
                                                        <button
                                                            onClick={() => setPerformanceDetail('financial')}
                                                            className="w-full px-6 py-6 flex items-center justify-between active:bg-neutral-50 transition-colors text-left"
                                                        >
                                                            <div className="space-y-1">
                                                                <p className="text-[21px] font-medium text-black leading-tight mb-2 lowercase first-letter:uppercase">{t({ en: 'Earnings', fr: 'Revenus', ar: 'الأرباح' })}</p>
                                                                <p className="text-[15px] text-neutral-600">
                                                                    {t({ en: `${monthLabel} total:`, fr: `Total ${monthLabel} :`, ar: `إجمالي ${monthLabel}:` })}{' '}
                                                                    <span className="font-black text-[#006B4D] tracking-tight">{netEarnings.toFixed(0)} MAD</span>
                                                                </p>
                                                                <p className="text-[15px] text-neutral-600">
                                                                    {t({ en: 'Task count:', fr: 'Nombre de missions :', ar: 'عدد المهام:' })}{' '}
                                                                    <span className="font-black text-[#006B4D]">{rDone}</span>
                                                                </p>
                                                            </div>
                                                            <ChevronRight size={22} strokeWidth={2.5} className="text-black ml-4" />
                                                        </button>
                                                    </div>

                                                    {/* Section: Reviews */}
                                                    <div className="bg-white">
                                                        <button
                                                            onClick={() => setPerformanceDetail('reputation')}
                                                            className="w-full px-6 py-6 flex items-center justify-between active:bg-neutral-50 transition-colors text-left"
                                                        >
                                                            <div className="flex-1 space-y-1">
                                                                <p className="text-[21px] font-medium text-black leading-tight mb-2 lowercase first-letter:uppercase">{t({ en: 'Reviews', fr: 'Avis', ar: 'التقييمات' })}</p>
                                                                <div className="flex items-center gap-4">
                                                                    <div>
                                                                        <span className="text-[24px] font-[1000] text-black leading-none">{Number(avgRating) > 0 ? avgRating : '–'}</span>
                                                                        <span className="text-[14px] text-neutral-400 font-black">/5</span>
                                                                    </div>
                                                                    <div className="flex gap-0.5">
                                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                                            <Star
                                                                                key={i}
                                                                                size={24}
                                                                                className={i < Math.round(Number(avgRating)) ? 'text-[#FFB800] fill-[#FFB800]' : 'text-neutral-200 fill-neutral-200'}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <p className="text-[14px] text-neutral-400 font-bold">
                                                                    ({monthRatings.length} {t({ en: 'reviews', fr: 'avis', ar: 'تقييم' })})
                                                                </p>
                                                            </div>
                                                            <ChevronRight size={22} strokeWidth={2.5} className="text-black ml-4" />
                                                        </button>
                                                    </div>

                                                    {/* Section: Reliability */}
                                                    <div className="bg-white">
                                                        <button
                                                            onClick={() => setPerformanceDetail('operational')}
                                                            className="w-full px-6 py-6 flex items-center justify-between active:bg-neutral-50 transition-colors text-left"
                                                        >
                                                            <div className="space-y-1">
                                                                <p className="text-[21px] font-medium text-black leading-tight mb-2 lowercase first-letter:uppercase">{t({ en: 'Skills & Rates', fr: 'Compétences & Tarifs', ar: 'المهارات والأسعار' })}</p>
                                                                <p className="text-[15px] text-neutral-600">
                                                                    {t({ en: 'Activated skills:', fr: 'Compétences actives :', ar: 'المهارات المفعلة:' })}{' '}
                                                                    <span className="font-[1000] text-[#006B4D] tracking-tight">{userData?.services?.length || 0}</span>
                                                                </p>
                                                                <p className="text-[13px] text-neutral-400 font-bold leading-tight">
                                                                    {t({
                                                                        en: '1 of your rates can be optimized to help your business.',
                                                                        fr: 'Un de vos tarifs peut être optimisé.',
                                                                        ar: 'يمكن تحسين أحد أسعارك لمساعدة عملك.'
                                                                    })}
                                                                </p>
                                                            </div>
                                                            <ChevronRight size={22} strokeWidth={2.5} className="text-black ml-4" />
                                                        </button>
                                                    </div>

                                                    {/* Section: Elite */}
                                                    <div className="bg-white">
                                                        <button
                                                            onClick={() => setPerformanceDetail('growth')}
                                                            className="w-full px-6 py-6 flex items-center justify-between active:bg-neutral-50 transition-colors text-left"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-[21px] font-medium text-black mb-1">{t({ en: 'Elite', fr: 'Élite', ar: 'نخبة' })}</p>
                                                                <p className="text-[13px] text-neutral-400 font-bold mb-4">{t({ en: 'Become Elite and earn up to 3x more!', fr: 'Devenez Élite et gagnez jusqu\'à 3x plus !', ar: 'كن من النخبة واربح حتى 3 أضعاف أكثر!' })}</p>

                                                                <div className="bg-[#E9F5F3] rounded-2xl p-4 border border-[#01A083]/10">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <span className="text-[11px] font-black text-[#01A083] uppercase tracking-widest">{t({ en: 'Elite progress', fr: 'Progression Élite', ar: 'تقدم النخبة' })}</span>
                                                                        <span className="text-[11px] font-[1000] text-[#01A083]">{healthScore}%</span>
                                                                    </div>
                                                                    <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${healthScore}%` }}
                                                                            className="h-full bg-[#01A083] rounded-full transition-all duration-500"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <ChevronRight size={22} strokeWidth={2.5} className="text-black ml-4" />
                                                        </button>
                                                    </div>

                                                    {/* Section: Pro Tips */}
                                                    <div className="bg-white pt-8 pb-10 px-6">
                                                        <p className="text-[11px] font-black text-neutral-400 mb-5">{t({ en: 'GROW YOUR BUSINESS', fr: 'DÉVELOPPEZ VOTRE ACTIVITÉ', ar: 'نمِّ عملك' })}</p>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {[
                                                                { id: 'tips-profile', title: t({ en: 'Profile tips', fr: 'Profil', ar: 'نصائح الملف الشخصي' }), desc: t({ en: 'Get more clicks', fr: 'Plus de clics', ar: 'احصل على المزيد من النقرات' }), icon: User, color: 'bg-[#FFCC02]/10 text-black' },
                                                                { id: 'tips-pricing', title: t({ en: 'Pricing', fr: 'Tarifs', ar: 'الأسعار' }), desc: t({ en: 'Earn more', fr: 'Gagnez plus', ar: 'اربح أكثر' }), icon: Tag, color: 'bg-[#01A083]/10 text-[#01A083]' },
                                                            ].map((tip) => (
                                                                <motion.button
                                                                    key={tip.id}
                                                                    whileTap={{ scale: 0.97 }}
                                                                    onClick={() => setPerformanceDetail(tip.id as any)}
                                                                    className="flex flex-col items-start gap-4 p-5  border border-[#CECECE] rounded-[28px] text-left hover:border-neutral-200 transition-all active:scale-95"
                                                                >
                                                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", tip.color.split(' ')[0])}>
                                                                        <tip.icon size={22} strokeWidth={2.5} className={tip.color.split(' ')[1]} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[15px] font-[1000] text-black leading-tight mb-1">{tip.title}</p>
                                                                        <p className="text-[11px] font-bold text-neutral-400 tracking-tight">{tip.desc}</p>
                                                                    </div>
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="performance-detail"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="bg-white min-h-[100vh] flex flex-col relative"
                                                >
                                                    {/* Sticky Header */}
                                                    <div className="px-5 pt-6 pb-4 flex items-center gap-4 sticky top-0 z-10 bg-white border-b border-neutral-100">
                                                        <button
                                                            onClick={() => setPerformanceDetail('none')}
                                                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-neutral-200 transition-all active:scale-90"
                                                        >
                                                            <ChevronLeft size={20} className="text-neutral-600" />
                                                        </button>
                                                        <h2 className="text-[17px] font-bold text-black">
                                                            {performanceDetail === 'financial' && t({ en: 'Earnings', fr: 'Revenus', ar: 'الأرباح' })}
                                                            {performanceDetail === 'operational' && t({ en: 'Reliability', fr: 'Fiabilité', ar: 'المصداقية' })}
                                                            {performanceDetail === 'reputation' && t({ en: 'Reviews', fr: 'Avis', ar: 'التقييمات' })}
                                                            {performanceDetail === 'marketing' && t({ en: 'Visibility', fr: 'Visibilité', ar: 'الظهور' })}
                                                            {performanceDetail === 'growth' && t({ en: 'Rank & Visibility', fr: 'Rang & Visibilité', ar: 'الترتيب والظهور' })}
                                                            {performanceDetail === 'tips-profile' && t({ en: 'Profile Tips', fr: 'Conseils Profil', ar: 'نصائح الملف الشخصي' })}
                                                            {performanceDetail === 'tips-pricing' && t({ en: 'Pricing Tips', fr: 'Conseils Tarifs', ar: 'نصائح الأسعار' })}
                                                            {performanceDetail === 'tips-stars' && t({ en: '5-Star Tips', fr: 'Conseils 5 Étoiles', ar: 'نصائح 5 نجوم' })}
                                                            {performanceDetail === 'tips-visibility' && t({ en: 'Visibility Tips', fr: 'Conseils Visibilité', ar: 'نصائح الظهور' })}
                                                        </h2>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                                                        {/* ── FINANCIAL ─────────────────────────────── */}
                                                        {performanceDetail === 'financial' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                {/* Hero stat */}
                                                                <div className="px-6 pt-6 pb-5 border-b border-neutral-100 bg-white">
                                                                    <p className="text-[13px] text-neutral-500 mb-1">{t({ en: 'Net earnings this period', fr: 'Gains nets cette période', ar: 'صافي الأرباح لهذه الفترة' })}</p>
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-[42px] font-black text-black leading-none">{netEarnings.toFixed(0)}</span>
                                                                        <span className="text-[18px] font-bold text-neutral-400">MAD</span>
                                                                    </div>
                                                                </div>

                                                                {/* Breakdown rows */}
                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden">
                                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'Gross earnings', fr: 'Gains bruts', ar: 'إجمالي الأرباح' })}</span>
                                                                        <span className="text-[15px] font-bold text-black">{totalEarnings.toFixed(0)} MAD</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'Platform fee (15%)', fr: 'Frais plateforme (15%)', ar: 'عمولة المنصة (15٪)' })}</span>
                                                                        <span className="text-[15px] font-bold text-red-500">−{lbricolCommission.toFixed(0)} MAD</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between px-5 py-4">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'Referral bonus', fr: 'Bonus parrainage', ar: 'مكافأة الإحالة' })}</span>
                                                                        <span className="text-[15px] font-bold text-[#01A083]">+{referralBonus.toFixed(0)} MAD</span>
                                                                    </div>
                                                                </div>

                                                                {/* Commission due */}
                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden">
                                                                    <div className="px-5 py-4 border-b border-neutral-50 flex items-center justify-between">
                                                                        <span className="text-[15px] font-bold text-black">{t({ en: 'Commission due to Lbricol', fr: 'Commission due à Lbricol', ar: 'العمولة المستحقة لـ Lbricol' })}</span>
                                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 rounded-full">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                                                            <span className="text-[11px] font-bold text-orange-500">{t({ en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' })}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-5 py-4">
                                                                        <div className="flex items-baseline gap-2 mb-4">
                                                                            <span className="text-[32px] font-black text-black">{lbricolCommission.toFixed(0)}</span>
                                                                            <span className="text-[16px] font-bold text-neutral-400">MAD</span>
                                                                        </div>

                                                                        {/* Transfer details */}
                                                                        <p className="text-[13px] font-bold text-neutral-500 mb-3">{t({ en: 'Transfer to:', fr: 'Virer vers :', ar: 'تحويل إلى:' })}</p>
                                                                        <div className="space-y-2 mb-4">
                                                                            <div className="flex justify-between">
                                                                                <span className="text-[14px] text-neutral-500">{t({ en: 'Name', fr: 'Nom', ar: 'الاسم' })}</span>
                                                                                <span className="text-[14px] font-bold text-black">Abdelmalek Tahri</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-[14px] text-neutral-500">{t({ en: 'Bank', fr: 'Banque', ar: 'البنك' })}</span>
                                                                                <span className="text-[14px] font-bold text-black">Al Barid Bank</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-2 mt-1 bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-100 cursor-pointer active:scale-95 transition-all" onClick={() => { navigator.clipboard.writeText('350810000000000880844466'); alert(t({ en: 'Copied!', fr: 'Copié !', ar: 'تم النسخ!' })); }}>
                                                                                <span className="text-[12px] font-mono text-black">350810000000000880844466</span>
                                                                                <Copy size={14} className="text-neutral-400 flex-shrink-0" />
                                                                            </div>
                                                                        </div>

                                                                        {/* Upload receipt */}
                                                                        <div className="flex flex-col gap-3 pt-2">
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
                                                                                                showToast({ variant: 'success', title: t({ en: 'Receipt Selected', fr: 'Reçu sélectionné', ar: 'تم اختيار الإيصال' }), description: t({ en: 'Click submit to send for verification.', fr: 'Cliquez sur envoyer pour vérification.', ar: 'اضغط على إرسال للتحقق.' }) });
                                                                                            };
                                                                                            reader.readAsDataURL(file);
                                                                                        }
                                                                                    };
                                                                                    input.click();
                                                                                }}
                                                                                className={cn('w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all border-2', settlementReceipt ? 'bg-black text-white border-black' : 'bg-transparent text-black border-neutral-200 hover:border-neutral-400')}
                                                                            >
                                                                                {settlementReceipt ? <PenTool size={16} /> : <CreditCard size={16} />}
                                                                                {settlementReceipt ? t({ en: 'Change receipt', fr: 'Changer le reçu', ar: 'تغيير الإيصال' }) : t({ en: 'Upload payment receipt', fr: 'Envoyer le reçu de paiement', ar: 'تحميل إيصال الدفع' })}
                                                                            </button>
                                                                            {settlementReceipt && (
                                                                                <button
                                                                                    disabled={isSubmittingSettlement}
                                                                                    onClick={async () => {
                                                                                        if (!auth.currentUser) return;
                                                                                        setIsSubmittingSettlement(true);
                                                                                        try {
                                                                                            const settlementDoc = await addDoc(collection(db, 'commission_settlements'), { bricolerId: auth.currentUser.uid, bricolerName: userData?.name || auth.currentUser.displayName || 'Unknown', amount: settlementAmount, receipt: settlementReceipt, status: 'pending', month: format(selectedMonthDt, 'yyyy-MM'), timestamp: serverTimestamp() });
                                                                                            await addDoc(collection(db, 'admin_notifications'), { type: 'commission_paid', settlementId: settlementDoc.id, bricolerId: auth.currentUser.uid, bricolerName: userData?.name || auth.currentUser.displayName || 'Unknown', amount: settlementAmount, read: false, createdAt: serverTimestamp() });
                                                                                            setSettlementReceipt(null);
                                                                                            showToast({ variant: 'success', title: t({ en: 'Submission Received!', fr: 'Envoi reçu !', ar: 'تم استلام طلبك!' }), description: t({ en: 'Admin will verify within 24h.', fr: 'L\'admin vérifiera sous 24h.', ar: 'سيقوم المسؤول بالتحقق في غضون 24 ساعة.' }) });
                                                                                        } catch (error) {
                                                                                            showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur', ar: 'خطأ' }), description: t({ en: 'Failed to submit. Please try again.', fr: 'Échec de l\'envoi. Veuillez réessayer.', ar: 'فشل الإرسال. يرجى المحاولة مرة أخرى.' }) });
                                                                                        } finally {
                                                                                            setIsSubmittingSettlement(false);
                                                                                        }
                                                                                    }}
                                                                                    className="w-full py-3.5 bg-[#01A083] hover:bg-[#008C74] text-white rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                                                                >
                                                                                    {isSubmittingSettlement ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                                                                                    {t({ en: 'Submit payment', fr: 'Envoyer le paiement', ar: 'تقديم الدفع' })}
                                                                                </button>
                                                                            )}
                                                                            <p className="text-center text-[12px] text-neutral-400">{t({ en: 'Verification within ~24 hours', fr: 'Vérification sous ~24 heures', ar: 'يتم التحقق في غضون ~24 ساعة' })}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── RELIABILITY ───────────────────────────── */}
                                                        {performanceDetail === 'operational' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                {/* Hero: radial + completion rate */}
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100 flex items-center gap-6">
                                                                    <div className="relative w-20 h-20 flex-shrink-0">
                                                                        <svg className="w-full h-full -rotate-90">
                                                                            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-neutral-100" />
                                                                            <motion.circle
                                                                                cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="7" fill="transparent"
                                                                                className={rScore >= 0.9 ? 'text-[#01A083]' : rScore >= 0.7 ? 'text-orange-400' : 'text-red-400'}
                                                                                strokeDasharray={2 * Math.PI * 34}
                                                                                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                                                                                animate={{ strokeDashoffset: (2 * Math.PI * 34) * (1 - rScore) }}
                                                                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                                                            />
                                                                        </svg>
                                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                                            <span className="text-[18px] font-black text-black">{Math.round(rScore * 100)}%</span>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[15px] font-bold text-black mb-0.5">{t({ en: 'Completion rate', fr: 'Taux d\'achèvement', ar: 'نسبة الإتمام' })}</p>
                                                                        <span className={`text-[13px] font-semibold ${rScore >= 0.9 && rDone >= 5 ? 'text-[#01A083]' : rScore >= 0.7 ? 'text-orange-500' : 'text-red-500'}`}>
                                                                            {rScore >= 0.9 && rDone >= 5
                                                                                ? t({ en: '🏆 Elite stability', fr: '🏆 Élite stabilité', ar: '🏆 إستقرار النخبة' })
                                                                                : rScore >= 0.7
                                                                                    ? t({ en: '📈 Good, keep going', fr: '📈 Bien, continuez', ar: '📈 جيد، استمر' })
                                                                                    : t({ en: '⚠️ Needs improvement', fr: '⚠️ À améliorer', ar: '⚠️ يحتاج تحسين' })}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Stats rows */}
                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden">
                                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'Completed missions', fr: 'Missions complétées', ar: 'المهمات المكتملة' })}</span>
                                                                        <span className="text-[15px] font-bold text-black">{monthDoneJobs.length}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'Cancellations', fr: 'Annulations', ar: 'الإلغاءات' })}</span>
                                                                        <span className={`text-[15px] font-bold ${(monthJobs.length - monthDoneJobs.length) > 0 ? 'text-red-500' : 'text-black'}`}>{monthJobs.length - monthDoneJobs.length}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between px-5 py-4">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'System rank preference', fr: 'Préférence de rang', ar: 'تفضيل الرتبة' })}</span>
                                                                        <span className={`text-[15px] font-bold ${rScore >= 0.8 ? 'text-[#01A083]' : 'text-orange-500'}`}>{rScore >= 0.8 ? t({ en: 'Active', fr: 'Actif', ar: 'نشط' }) : t({ en: 'Low', fr: 'Bas', ar: 'منخفض' })}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Tip */}
                                                                <div className="mx-4 mt-4 px-4 py-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                                                                    <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                                                                    <p className="text-[13px] text-blue-700 leading-relaxed">
                                                                        {t({
                                                                            en: 'Cancellations impact your search rank. Keep your completion rate above 90% for maximum visibility.',
                                                                            fr: 'Les annulations impactent votre classement. Gardez un taux d\'achèvement supérieur à 90% pour une visibilité maximale.',
                                                                            ar: 'الإلغاءات تؤثر على ترتيب بحثك. حافظ على نسبة إتمام فوق 90% لأقصى قدر من الظهور.'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── REPUTATION ────────────────────────────── */}
                                                        {performanceDetail === 'reputation' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                {/* Hero */}
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <p className="text-[13px] text-neutral-500 mb-1">{t({ en: 'Average rating', fr: 'Note moyenne', ar: 'متوسط التقييم' })}</p>
                                                                    <div className="flex items-center gap-4 mb-2">
                                                                        <span className="text-[42px] font-black text-black leading-none">{Number(avgRating) > 0 ? avgRating : '–'}</span>
                                                                        <div className="flex gap-1">
                                                                            {Array.from({ length: 5 }).map((_, i) => (
                                                                                <Star key={i} size={22} className={i < Math.round(Number(avgRating)) ? 'text-[#FFCC02] fill-[#FFCC02]' : 'text-neutral-200 fill-neutral-200'} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-[13px] font-semibold ${Number(avgRating) >= 4.5 && monthRatings.length >= 5 ? 'text-[#01A083]' : Number(avgRating) >= 3.5 ? 'text-orange-500' : 'text-red-500'}`}>
                                                                        {Number(avgRating) >= 4.5 && monthRatings.length >= 5
                                                                            ? t({ en: '🏆 Elite quality', fr: '🏆 Qualité élite', ar: '🏆 جودة النخبة' })
                                                                            : Number(avgRating) >= 3.5
                                                                                ? t({ en: '👍 Good work', fr: '👍 Bon travail', ar: '👍 عمل جيد' })
                                                                                : t({ en: '⚠️ Needs focus', fr: '⚠️ À améliorer', ar: '⚠️ يحتاج تركيز' })}
                                                                    </span>
                                                                </div>

                                                                {/* Stats */}
                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden">
                                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
                                                                        <span className="text-[15px] text-neutral-700">{t({ en: 'Reviews this month', fr: 'Avis ce mois-ci', ar: 'التقييمات هذا الشهر' })}</span>
                                                                        <span className="text-[15px] font-bold text-black">{monthRatings.length}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Distribution */}
                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden px-5 py-4">
                                                                    <p className="text-[13px] font-bold text-neutral-500 mb-4">{t({ en: 'Rating breakdown', fr: 'Répartition des notes', ar: 'توزيع التقييمات' })}</p>
                                                                    <div className="space-y-3">
                                                                        {ratingBreakdown.map(rb => (
                                                                            <div key={rb.star} className="flex items-center gap-3">
                                                                                <div className="flex items-center gap-1 w-8 flex-shrink-0">
                                                                                    <span className="text-[14px] font-bold text-neutral-700">{rb.star}</span>
                                                                                    <Star size={12} fill="currentColor" className="text-amber-400" />
                                                                                </div>
                                                                                <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                                                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${rb.pct}%` }} transition={{ duration: 0.8, delay: rb.star * 0.08 }} className="h-full bg-amber-400 rounded-full" />
                                                                                </div>
                                                                                <span className="text-[13px] text-neutral-400 w-9 text-right">{rb.pct}%</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Recent reviews note */}
                                                                <div className="mx-4 mt-4 px-5 py-4 bg-white rounded-2xl border border-neutral-100">
                                                                    <p className="text-[15px] font-bold text-black mb-1">{t({ en: 'Recent Reviews', fr: 'Avis récents', ar: 'التعليقات الأخيرة' })}</p>
                                                                    <p className="text-[14px] text-neutral-500 leading-relaxed">
                                                                        {monthRatings.length > 0
                                                                            ? t({ en: 'You have solid feedback from your clients this month.', fr: 'Vous avez de bons retours de vos clients ce mois-ci.', ar: 'لديك تعليقات قوية من عملائك هذا الشهر.' })
                                                                            : t({ en: 'No reviews yet. Complete more missions to earn stars!', fr: 'Pas encore d\'avis. Finalisez plus de missions pour gagner des étoiles !', ar: 'لا توجد تعليقات بعد. أكمل المزيد من المهمات لكسب النجوم!' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── MARKETING (Visibility) ─────────────────── */}
                                                        {performanceDetail === 'marketing' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#01A083]/10 rounded-full mb-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#01A083]" />
                                                                        <span className="text-[12px] font-bold text-[#01A083]">{t({ en: 'Beta feature', fr: 'Fonctionnalité bêta', ar: 'ميزة تجريبية' })}</span>
                                                                    </div>
                                                                    <p className="text-[15px] text-neutral-700 leading-relaxed">
                                                                        {t({
                                                                            en: 'Search performance data is being calibrated. You\'ll soon see exactly how often your profile appears in client searches.',
                                                                            fr: 'Les données de performance de recherche sont en cours de calibration. Vous verrez bientôt combien de fois votre profil apparaît dans les recherches.',
                                                                            ar: 'يتم حالياً معايرة بيانات أداء البحث. سترى قريباً عدد المرات التي يظهر فيها ملفك الشخصي في عمليات بحث العملاء.'
                                                                        })}
                                                                    </p>
                                                                </div>

                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden px-5 py-5">
                                                                    <div className="flex items-center justify-between mb-4">
                                                                        <p className="text-[15px] font-bold text-black">{t({ en: 'Monthly activity', fr: 'Activité mensuelle' })}</p>
                                                                        <span className="text-[13px] font-bold text-[#01A083] bg-[#01A083]/10 px-2.5 py-1 rounded-full">+{Math.round(healthScore / 2)}%</span>
                                                                    </div>
                                                                    <div className="h-24 w-full flex items-end gap-1.5">
                                                                        {Array.from({ length: 12 }).map((_, i) => {
                                                                            const baseHeight = 20 + (monthDoneJobs.length * 5);
                                                                            const val = Math.min(Math.max(baseHeight + (Math.sin(i * 1.5) * 15), 10), 100);
                                                                            return (
                                                                                <motion.div key={i} className="flex-1 bg-[#01A083]/20 rounded-t-lg hover:bg-[#01A083]/60 transition-colors" initial={{ height: 0 }} animate={{ height: `${val}%` }} transition={{ delay: i * 0.04, duration: 0.6, ease: 'easeOut' }} />
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <p className="text-[12px] text-neutral-400 text-right mt-2">{selectedMonthDt.getFullYear()}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── GROWTH (Rank & Visibility) ─────────────── */}
                                                        {performanceDetail === 'growth' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                {/* Score hero */}
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <p className="text-[13px] text-neutral-500 mb-1">{t({ en: 'Opportunity score', fr: 'Score d\'opportunité', ar: 'درجة الفرصة' })}</p>
                                                                    <div className="flex items-baseline gap-2 mb-1">
                                                                        <span className="text-[42px] font-black text-black leading-none">{healthScore}</span>
                                                                        <span className="text-[18px] font-bold text-neutral-400">/ 100</span>
                                                                    </div>
                                                                    <span className={`text-[13px] font-semibold ${healthScore >= 80 ? 'text-[#01A083]' : healthScore >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                                                                        {healthScore >= 80
                                                                            ? t({ en: '🏆 Elite — top of search results', fr: '🏆 Élite — en tête des résultats', ar: '🏆 نخبة — في صدارة نتائج البحث' })
                                                                            : healthScore >= 50
                                                                                ? t({ en: '📈 Growing — complete more missions', fr: '📈 En progression — complétez plus', ar: '📈 في تطور — أكمل المزيد من المهمات' })
                                                                                : t({ en: '⚠️ Needs attention — low visibility', fr: '⚠️ Action requise — faible visibilité', ar: '⚠️ يحتاج انتباه — ظهور منخفض' })}
                                                                    </span>
                                                                </div>

                                                                {/* Referrals card */}
                                                                <div className="bg-white mt-4 mx-4 rounded-2xl border border-neutral-100 overflow-hidden px-5 py-5">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-10 h-10 bg-[#01A083]/10 rounded-xl flex items-center justify-center">
                                                                            <Zap size={20} className="text-[#01A083]" />
                                                                        </div>
                                                                        <p className="text-[16px] font-bold text-black">{t({ en: 'Unlock Rewards', fr: 'Débloquer des récompenses', ar: 'فتح المكافآت' })}</p>
                                                                    </div>
                                                                    <p className="text-[14px] text-neutral-500 leading-relaxed mb-4">
                                                                        {t({
                                                                            en: 'Refer other Bricolers and earn 50 MAD for each one who completes their first mission.',
                                                                            fr: 'Parrainez d\'autres Bricoleurs et gagnez 50 MAD pour chacun qui termine sa première mission.',
                                                                            ar: 'قم بإحالة "بريكولير" آخرين واربح 50 درهمًا لكل شخص يكمل مهمته الأولى.'
                                                                        })}
                                                                    </p>
                                                                    <button
                                                                        onClick={() => { setPerformanceDetail('none'); setShowNotificationsPage(true); }}
                                                                        className="w-full py-3.5 bg-black text-white rounded-xl text-[14px] font-bold active:scale-95 transition-all"
                                                                    >
                                                                        {t({ en: 'Open Referrals', fr: 'Ouvrir les parrainages', ar: 'فتح الإحالات' })}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── TIP: PROFILE ──────────────────────────── */}
                                                        {performanceDetail === 'tips-profile' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <p className="text-[24px] font-black text-black leading-tight">{t({ en: 'The Magnet Profile', fr: 'Le Profil Aimant', ar: 'الملف الشخصي الجاذب' })}</p>
                                                                    <p className="text-[14px] text-[#01A083] font-semibold mt-1">{t({ en: 'Get +35% more client interest', fr: '+35% d\'intérêt client en plus', ar: 'احصل على +35% زيادة في اهتمام العملاء' })}</p>
                                                                </div>
                                                                <div className="space-y-3 p-4">
                                                                    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
                                                                        <div className="px-5 py-4 border-l-4 border-amber-400">
                                                                            <p className="text-[13px] font-bold text-neutral-500 mb-1">{t({ en: 'Step 1: The Bio Formula', fr: 'Étape 1 : La formule de bio', ar: 'الخطوة 1: صيغة النبذة' })}</p>
                                                                            <p className="text-[14px] text-neutral-700 leading-relaxed italic">
                                                                                {t({
                                                                                    en: '"I\'m a [Niche] expert with [Years] exp. I help clients with [Problem A] & [Problem B]."',
                                                                                    fr: '"Je suis expert en [Niche] avec [Années] d\'exp. J\'aide mes clients pour [Problème A] & [Problème B]."',
                                                                                    ar: '"أنا خبير في [المجال] مع خبرة [سنوات]. أساعد العملاء في [المشكلة أ] و [المشكلة ب]."'
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-4">
                                                                        <p className="text-[13px] font-bold text-neutral-500 mb-1">{t({ en: 'Step 2: Social Proof', fr: 'Étape 2 : La preuve sociale', ar: 'الخطوة 2: الدليل الاجتماعي' })}</p>
                                                                        <p className="text-[14px] text-neutral-700 leading-relaxed">
                                                                            {t({
                                                                                en: 'Adding 3 high-quality photos of your work increases trust by 50%.',
                                                                                fr: 'Ajouter 3 photos de qualité de votre travail augmente la confiance de 50 %.',
                                                                                ar: 'إضافة 3 صور عالية الجودة لعملك تزيد من الثقة بنسبة 50٪.'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── TIP: PRICING ──────────────────────────── */}
                                                        {performanceDetail === 'tips-pricing' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <p className="text-[24px] font-black text-black leading-tight">{t({ en: 'Market Legend', fr: 'Légende du Marché', ar: 'أسطورة السوق' })}</p>
                                                                    <p className="text-[14px] text-[#01A083] font-semibold mt-1">{t({ en: 'Master your unit economics', fr: 'Maîtrisez votre rentabilité', ar: 'أتقن اقتصادياتك الربحية' })}</p>
                                                                </div>
                                                                <div className="space-y-3 p-4">
                                                                    <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-4 flex gap-4">
                                                                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0"><TrendingUp size={18} className="text-green-600" /></div>
                                                                        <div>
                                                                            <p className="text-[15px] font-bold text-black mb-1">{t({ en: 'Competitive Anchoring', fr: 'Positionnement concurrentiel', ar: 'ترسيخ تنافسي' })}</p>
                                                                            <p className="text-[14px] text-neutral-500 leading-relaxed">
                                                                                {t({
                                                                                    en: 'Start 5% below market to build reviews, then raise your rate once you have a strong profile.',
                                                                                    fr: 'Commencez 5 % sous le marché pour obtenir des avis, puis augmentez une fois votre profil renforcé.',
                                                                                    ar: 'ابدأ بنسبة 5٪ أقل من السوق لبناء التقييمات، ثم ارفع سعرك بمجرد أن يكون لديك ملف شخصي قوي.'
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-white rounded-2xl border border-neutral-100 px-5 py-4 flex gap-4">
                                                                        <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0"><Zap size={18} className="text-orange-500" /></div>
                                                                        <div>
                                                                            <p className="text-[15px] font-bold text-black mb-1">{t({ en: 'Add-on Strategy', fr: 'Stratégie complémentaire', ar: 'استراتيجية الإضافات' })}</p>
                                                                            <p className="text-[14px] text-neutral-500 leading-relaxed">
                                                                                {t({
                                                                                    en: 'Suggest maintenance or extras — it boosts your average ticket without extra effort.',
                                                                                    fr: 'Proposez maintenance ou options — cela augmente le panier moyen sans effort supplémentaire.',
                                                                                    ar: 'اقترح الصيانة أو الإضافات — فهذا يعزز متوسط دخل المهمة دون مجهود إضافي.'
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── TIP: 5 STARS ──────────────────────────── */}
                                                        {performanceDetail === 'tips-stars' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <p className="text-[24px] font-black text-black leading-tight">{t({ en: '5-Star Protocol', fr: 'Protocole 5 Étoiles', ar: 'بروتوكول 5 نجوم' })}</p>
                                                                    <p className="text-[14px] text-[#01A083] font-semibold mt-1">{t({ en: 'Build lifelong clients', fr: 'Fidélisez vos clients à vie', ar: 'ابنِ قاعدة عملاء مدى الحياة' })}</p>
                                                                </div>
                                                                <div className="space-y-3 p-4">
                                                                    {[
                                                                        { t: t({ en: 'Be Early', fr: 'Soyez en avance', ar: 'كن مبكراً' }), d: t({ en: 'Arriving 5 mins early leads to a 4.8-star average.', fr: 'Arriver 5 minutes en avance mène à une moyenne de 4,8 étoiles.', ar: 'الوصول مبكرًا بـ 5 دقائق يؤدي إلى متوسط 4.8 نجمة.' }) },
                                                                        { t: t({ en: 'Clean Up', fr: 'Nettoyez après', ar: 'نظف المكان' }), d: t({ en: 'Never leave tools or dust — the finish is what clients remember.', fr: 'Ne laissez jamais d\'outils ni de poussière — la finition est ce dont ils se souviennent.', ar: 'لا تترك الأدوات أو الغبار أبدًا — اللمسة النهائية هي ما يتذكره العملاء.' }) },
                                                                        { t: t({ en: 'The Follow-Up', fr: 'Le suivi', ar: 'المتابعة' }), d: t({ en: 'Message 24h later: "Is everything working perfectly?"', fr: 'Envoyez un message 24h plus tard : "Tout fonctionne parfaitement ?"', ar: 'أرسل رسالة بعد 24 ساعة: "هل كل شيء يعمل بشكل مثالي؟"' }) },
                                                                    ].map((item, idx) => (
                                                                        <div key={idx} className="bg-white rounded-2xl border border-neutral-100 px-5 py-4 flex items-start gap-4">
                                                                            <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200 flex items-center justify-center font-bold text-[13px] text-neutral-600 flex-shrink-0">{idx + 1}</div>
                                                                            <div>
                                                                                <p className="text-[15px] font-bold text-black mb-0.5">{item.t}</p>
                                                                                <p className="text-[13px] text-neutral-500 leading-relaxed">{item.d}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ── TIP: VISIBILITY ───────────────────────── */}
                                                        {performanceDetail === 'tips-visibility' && (
                                                            <div className="animate-in fade-in duration-300">
                                                                <div className="px-6 pt-6 pb-5 bg-white border-b border-neutral-100">
                                                                    <p className="text-[24px] font-black text-black leading-tight">{t({ en: 'Ranking Hacker', fr: 'Hacker de Classement', ar: 'مخترق الترتيب' })}</p>
                                                                    <p className="text-[14px] text-[#01A083] font-semibold mt-1">{t({ en: 'Master the algorithm', fr: 'Maîtrisez l\'algorithme', ar: 'أتقن الخوارزمية' })}</p>
                                                                </div>
                                                                <div className="space-y-3 p-4">
                                                                    <p className="text-[13px] font-bold text-neutral-500 px-1">{t({ en: 'Top ranking factors:', fr: 'Facteurs clés de classement :', ar: 'عوامل الترتيب الرئيسية:' })}</p>
                                                                    {[
                                                                        { icon: Check, color: 'bg-emerald-50 text-emerald-600', label: t({ en: 'High completion rate (>90%)', fr: 'Taux d\'achèvement élevé (>90%)', ar: 'نسبة إتمام عالية (>90%)' }) },
                                                                        { icon: Zap, color: 'bg-blue-50 text-blue-600', label: t({ en: 'Response time under 15 mins', fr: 'Temps de réponse inférieur à 15 min', ar: 'وقت استجابة أقل من 15 دقيقة' }) },
                                                                        { icon: TrendingUp, color: 'bg-orange-50 text-orange-500', label: t({ en: 'Frequent commission settlements', fr: 'Règlements de commission fréquents', ar: 'تسوية العمولات بشكل متكرر' }) },
                                                                    ].map((item, idx) => (
                                                                        <div key={idx} className="bg-white rounded-2xl border border-neutral-100 px-5 py-4 flex items-center gap-4">
                                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color.split(' ')[0]}`}>
                                                                                <item.icon size={18} className={item.color.split(' ')[1]} />
                                                                            </div>
                                                                            <p className="text-[14px] font-medium text-neutral-700">{item.label}</p>
                                                                        </div>
                                                                    ))}
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
