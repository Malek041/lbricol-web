import React, { useState, memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, Users, ShoppingBag, Globe,
    ChevronDown, ArrowUpRight, ArrowDownRight,
    MapPin, Calendar, DollarSign
} from 'lucide-react';
import { useAdminKpiOverview } from '@/features/admin/hooks/useAdminKpiOverview';

interface AdminDashboardProps {
    t: (vals: { en: string; fr: string; ar?: string }) => string;
}

const StatCard = memo(({ title, value, icon: Icon, growth, suffix = '', loading }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100"
    >
        <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-[#FFC244]/10 rounded-2xl flex items-center justify-center">
                <Icon size={24} className="text-black" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold ${growth >= 0 ? 'text-[#01A083]' : 'text-red-500'}`}>
                {growth >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(growth)}%
            </div>
        </div>
        <h3 className="text-neutral-500 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-black text-black">
            {loading ? '...' : `${value}${suffix}`}
        </div>
    </motion.div>
));

const AdminDashboard = memo(({ t }: AdminDashboardProps) => {
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const { loading, global, cities } = useAdminKpiOverview();

    const cityOptions = useMemo(
        () => [
            { id: 'all', name: t({ en: 'All Cities', fr: 'Toutes les villes', ar: 'كل المدن' }) },
            ...cities.map((c) => ({ id: c.cityId, name: c.cityId })),
        ],
        [cities, t],
    );

    const selectedStats = useMemo(() => {
        if (selectedCity === 'all') {
            return global;
        }
        const match = cities.find((c) => c.cityId === selectedCity);
        if (!match) {
            return {
                totalOrders: 0,
                totalGmv: 0,
                totalRevenue: 0,
                activeBricolers: 0,
                growthOrders: 0,
                growthGmv: 0,
                growthRevenue: 0,
                categoryDemand: {},
                areaDemand: {},
            };
        }
        return match as any;
    }, [selectedCity, global, cities]) as any;

    return (
        <div className="flex flex-col min-h-screen bg-[#FAFAFA] pb-24">
            {/* Header */}
            <div className="bg-[#FFC244] pt-12 pb-24 px-5 rounded-b-[40px]">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-[32px] font-black text-black">
                        {t({ en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' })}
                    </h1>
                    <div className="relative group">
                        <button className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm border border-white/30">
                            <MapPin size={16} />
                            {cityOptions.find(c => c.id === selectedCity)?.name}
                            <ChevronDown size={14} />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-100 hidden group-hover:block z-50 overflow-hidden">
                            {cityOptions.map(city => (
                                <button
                                    key={city.id}
                                    onClick={() => setSelectedCity(city.id)}
                                    className="w-full px-5 py-3 text-left hover:bg-neutral-50 text-sm font-medium transition-colors border-b border-neutral-50 last:border-0"
                                >
                                    {city.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Content */}
            <div className="px-5 -mt-12 space-y-4">
                {/* Global KPI row */}
                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        title={t({ en: 'Platform GMV', fr: 'GMV Plateforme', ar: 'إجمالي حجم العمليات (المنصة)' })}
                        value={global.totalGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        suffix=" MAD"
                        icon={ShoppingBag}
                        growth={global.growthGmv}
                        loading={loading}
                    />
                    <StatCard
                        title={t({ en: 'Platform Revenue', fr: 'Revenus Plateforme', ar: 'إيرادات المنصة' })}
                        value={global.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        suffix=" MAD"
                        icon={DollarSign}
                        growth={global.growthRevenue}
                        loading={loading}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        title={t({ en: 'Total Orders', fr: 'Commandes', ar: 'إجمالي الطلبات' })}
                        value={selectedStats.totalOrders}
                        icon={ShoppingBag}
                        growth={selectedStats.growthOrders}
                        loading={loading}
                    />
                    <StatCard
                        title={t({ en: 'Active Bricolers', fr: 'Bricoleurs', ar: 'المحترفون النشطون' })}
                        value={selectedStats.activeBricolers}
                        icon={Users}
                        growth={100}
                        loading={loading}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        title={t({ en: 'Active Cities', fr: 'Villes actives', ar: 'المدن النشطة' })}
                        value={global.activeCities}
                        icon={Globe}
                        growth={0}
                        loading={loading}
                    />
                    <StatCard
                        title={t({ en: 'Total Clients', fr: 'Clients', ar: 'العملاء' })}
                        value={global.totalClients}
                        icon={Users}
                        growth={0}
                        loading={loading}
                    />
                </div>

                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100">
                    <h3 className="text-lg font-black text-black mb-4">
                        {t({ en: 'Cities performance', fr: 'Performance par ville', ar: 'أداء المدن' })}
                    </h3>
                    <div className="space-y-3">
                        {cities.length === 0 && (
                            <p className="text-sm text-neutral-400">
                                {t({ en: 'No active cities yet.', fr: 'Aucune ville active pour le moment.', ar: 'لا توجد مدن نشطة حالياً.' })}
                            </p>
                        )}
                        {cities.map((city) => (
                            <div key={city.cityId} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <TrendingUp size={20} className="text-[#01A083]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-black flex items-center gap-2">
                                        {city.cityId}
                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                                            {t({ en: 'GMV', fr: 'GMV', ar: 'حجم العمليات' })} {city.totalGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD
                                        </span>
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        {t({ en: 'Orders', fr: 'Commandes', ar: 'الطلبات' })}: {city.totalOrders} • {t({ en: 'Active pros', fr: 'Pros actifs', ar: 'محترفون نشطون' })}: {city.activeBricolers} • {t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })}: {city.activeServices}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-neutral-400">{t({ en: 'Avg rating', fr: 'Note moy.', ar: 'متوسط التقييم' })}</p>
                                    <p className="text-sm font-black text-black">
                                        {city.avgRating ? city.avgRating.toFixed(1) : '–'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Service Category Performance */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100">
                    <h3 className="text-lg font-black text-black mb-4">
                        {t({ en: 'Service category performance', fr: 'Performance par catégorie', ar: 'أداء فئات الخدمات' })}
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(selectedStats.categoryDemand || {}).sort((a: any, b: any) => b[1] - a[1]).map(([cat, count]: any) => (
                            <div key={cat} className="flex flex-col gap-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-neutral-800 capitalize">{cat.replace('_', ' ')}</span>
                                    <span className="text-neutral-500 font-medium">{count} {t({ en: 'orders', fr: 'commandes', ar: 'طلب' })}</span>
                                </div>
                                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(count / (selectedStats.totalOrders || 1)) * 100}%` }}
                                        className="h-full bg-[#01A083] rounded-full"
                                    />
                                </div>
                            </div>
                        ))}
                        {!selectedStats.categoryDemand && (
                            <p className="text-sm text-neutral-400">{t({ en: 'Loading details...', fr: 'Chargement des détails...', ar: 'جاري تحميل التفاصيل...' })}</p>
                        )}
                    </div>
                </div>

                {/* Demand Heatmap (Areas) */}
                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100">
                    <h3 className="text-lg font-black text-black mb-4">
                        {t({ en: 'Demand Heatmap', fr: 'Carte de chaleur de la demande', ar: 'خريطة حرارة الطلب' })}
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(selectedStats.areaDemand || {}).sort((a: any, b: any) => b[1] - a[1]).map(([area, count]: any, idx) => {
                            const intensity = Math.max(0.1, count / (selectedStats.totalOrders / 2 || 1));
                            return (
                                <div key={area} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl relative overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-[#01A083]"
                                        style={{ width: '4px', opacity: intensity }}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-black">{area}</p>
                                        <p className="text-xs text-neutral-500">{count} {t({ en: 'active requests', fr: 'demandes actives', ar: 'طلب نشط' })}</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: `rgba(0, 160, 130, ${intensity * 0.2})`, color: '#01A083' }}>
                                        #{idx + 1}
                                    </div>
                                </div>
                            );
                        })}
                        {!selectedStats.areaDemand && (
                            <p className="text-sm text-neutral-400">{t({ en: 'No data for this city yet.', fr: 'Aucune donnée pour cette ville.', ar: 'لا توجد بيانات لهذه المدينة بعد.' })}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AdminDashboard;
