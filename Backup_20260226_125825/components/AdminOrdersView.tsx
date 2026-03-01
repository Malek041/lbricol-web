import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Search, Filter, MapPin,
    Calendar as CalendarIcon, Clock, ChevronRight,
    CheckCircle2, AlertCircle, RotateCcw, XCircle
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { format } from 'date-fns';

interface AdminOrdersViewProps {
    t: (vals: { en: string; fr: string }) => string;
}

const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({ t }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const cities = ['all', 'Marrakech', 'Casablanca', 'Essaouira', 'Agadir', 'Rabat', 'Tangier'];

    useEffect(() => {
        setLoading(true);
        let q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));

        if (selectedCity !== 'all') {
            q = query(collection(db, 'jobs'), where('city', '==', selectedCity), orderBy('createdAt', 'desc'));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setOrders(loadedOrders);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedCity]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
            case 'done':
                return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 };
            case 'pending':
            case 'waiting':
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock };
            case 'cancelled':
                return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
            case 'negotiating':
                return { bg: 'bg-blue-100', text: 'text-blue-700', icon: RotateCcw };
            default:
                return { bg: 'bg-neutral-100', text: 'text-neutral-700', icon: AlertCircle };
        }
    };

    const filteredOrders = orders.filter(order =>
        order.service?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col min-h-screen bg-white pb-24">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl pt-12 pb-4 px-5 border-b border-neutral-100">
                <h1 className="text-2xl font-black text-black mb-6">
                    {t({ en: 'Platform Orders', fr: 'Commandes Plateforme' })}
                </h1>

                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                    {cities.map(city => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCity === city
                                    ? 'bg-black text-white'
                                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                }`}
                        >
                            {city === 'all' ? t({ en: 'All Cities', fr: 'Toutes les villes' }) : city}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t({ en: 'Search orders, services...', fr: 'Rechercher commandes, services...' })}
                        className="w-full h-12 bg-neutral-100 rounded-2xl pl-12 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-black transition-all outline-none"
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="px-5 py-6 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                ) : filteredOrders.length > 0 ? (
                    filteredOrders.map(order => {
                        const style = getStatusStyle(order.status);
                        const StatusIcon = style.icon;

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={order.id}
                                className="bg-white rounded-[28px] p-5 border border-neutral-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`px-3 py-1 rounded-full ${style.bg} ${style.text} text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5`}>
                                        <StatusIcon size={12} />
                                        {order.status}
                                    </div>
                                    <span className="text-neutral-400 text-[11px] font-medium">
                                        {order.createdAt?.seconds ? format(order.createdAt.seconds * 1000, 'MMM d, HH:mm') : 'Recently'}
                                    </span>
                                </div>

                                <h3 className="text-lg font-black text-black mb-1">{order.service}</h3>
                                <div className="flex items-center gap-2 text-neutral-500 text-sm mb-4">
                                    <MapPin size={14} />
                                    {order.city} • {order.location}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                                            <ShoppingBag size={14} className="text-neutral-400" />
                                        </div>
                                        <div className="text-xs">
                                            <p className="text-neutral-400 font-medium">Client ID</p>
                                            <p className="text-black font-bold">...{order.clientId?.slice(-6)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-neutral-400 text-xs font-medium">Total</p>
                                        <p className="text-black font-black text-lg">{order.price} DH</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag size={32} className="text-neutral-300" />
                        </div>
                        <p className="text-neutral-400 font-medium">{t({ en: 'No orders found', fr: 'Aucune commande trouvée' })}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOrdersView;
