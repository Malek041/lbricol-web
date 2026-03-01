import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, Users, ShoppingBag, Globe,
    ChevronDown, ArrowUpRight, ArrowDownRight,
    MapPin, Calendar, DollarSign
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';

interface AdminDashboardProps {
    t: (vals: { en: string; fr: string }) => string;
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
            <div className={`flex items-center gap-1 text-sm font-bold ${growth >= 0 ? 'text-[#00A082]' : 'text-red-500'}`}>
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
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalGmv: 0,
        totalRevenue: 0,
        activeBricolers: 0,
        growthOrders: 12.5, // Mock growth
        growthGmv: 15.2,
        growthRevenue: 8.2,
    });
    const [loading, setLoading] = useState(true);

    const cities = [
        { id: 'all', name: t({ en: 'All Cities', fr: 'Toutes les villes' }) },
        { id: 'Marrakech', name: 'Marrakech' },
        { id: 'Casablanca', name: 'Casablanca' },
        { id: 'Essaouira', name: 'Essaouira' },
        { id: 'Agadir', name: 'Agadir' },
        { id: 'Rabat', name: 'Rabat' },
        { id: 'Tangier', name: 'Tanger' }
    ];

    useEffect(() => {
        setLoading(true);

        let ordersQuery = query(collection(db, 'jobs'));
        if (selectedCity !== 'all') {
            ordersQuery = query(collection(db, 'jobs'), where('city', '==', selectedCity));
        }

        let bricolersQuery = query(collection(db, 'bricolers'));
        if (selectedCity !== 'all') {
            bricolersQuery = query(collection(db, 'bricolers'), where('city', '==', selectedCity));
        }

        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => doc.data());
            const totalOrders = ordersData.length;

            const completedOrders = ordersData.filter(order => order.status === 'done' || order.status === 'completed');

            const totalGmv = completedOrders.reduce((acc, order) => {
                const val = order.totalPrice !== undefined ? Number(order.totalPrice) : Number(order.price);
                return acc + (isNaN(val) ? 0 : val);
            }, 0);

            const totalRevenue = completedOrders.reduce((acc, order) => {
                const val = Number(order.serviceFee);
                return acc + (isNaN(val) ? 0 : val);
            }, 0);

            setStats(prev => ({
                ...prev,
                totalOrders,
                totalGmv,
                totalRevenue
            }));
            setLoading(false);
        });

        const unsubBricolers = onSnapshot(bricolersQuery, (snapshot) => {
            setStats(prev => ({
                ...prev,
                activeBricolers: snapshot.docs.length
            }));
        });

        return () => {
            unsubOrders();
            unsubBricolers();
        };
    }, [selectedCity]);

    return (
        <div className="flex flex-col min-h-screen bg-[#FAFAFA] pb-24">
            {/* Header */}
            <div className="bg-[#FFC244] pt-12 pb-24 px-5 rounded-b-[40px]">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-[32px] font-black text-black">
                        {t({ en: 'Dashboard', fr: 'Tableau de bord' })}
                    </h1>
                    <div className="relative group">
                        <button className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm border border-white/30">
                            <MapPin size={16} />
                            {cities.find(c => c.id === selectedCity)?.name}
                            <ChevronDown size={14} />
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-neutral-100 hidden group-hover:block z-50 overflow-hidden">
                            {cities.map(city => (
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

                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        title={t({ en: 'Total GMV', fr: 'Volume (GMV)' })}
                        value={stats.totalGmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        suffix=" DH"
                        icon={ShoppingBag}
                        growth={stats.growthGmv}
                        loading={loading}
                    />
                    <StatCard
                        title={t({ en: 'Revenue', fr: 'Revenus' })}
                        value={stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        suffix=" DH"
                        icon={DollarSign}
                        growth={stats.growthRevenue}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="px-5 -mt-12 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        title={t({ en: 'Total Orders', fr: 'Commandes' })}
                        value={stats.totalOrders}
                        icon={ShoppingBag}
                        growth={stats.growthOrders}
                        loading={loading}
                    />
                    <StatCard
                        title={t({ en: 'Active Bricolers', fr: 'Bricoleurs' })}
                        value={stats.activeBricolers}
                        icon={Users}
                        growth={5.2}
                        loading={loading}
                    />
                </div>

                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100">
                    <h3 className="text-lg font-black text-black mb-4">
                        {t({ en: 'Platform Activity', fr: 'Activité Plateforme' })}
                    </h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <TrendingUp size={20} className="text-[#00A082]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-black">New order in Marrakech</p>
                                    <p className="text-xs text-neutral-500">2 minutes ago</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-black">450 DH</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AdminDashboard;
