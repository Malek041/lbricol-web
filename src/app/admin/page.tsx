"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import AdminDashboard from '@/features/admin/components/AdminDashboard';
import AdminOrdersView from '@/features/orders/components/AdminOrdersView';
import AdminBricolersView from '@/features/admin/components/AdminBricolersView';
import AdminBricolerCreator from '@/features/admin/components/AdminBricolerCreator';
import AdminNotificationsView from '@/features/admin/components/AdminNotificationsView';
import AdminReceivablesView from '@/features/admin/components/AdminReceivablesView';
import AdminReviewsView from '@/features/admin/components/AdminReviewsView';
import MessagesView from '@/features/messages/components/MessagesView';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { Shield, Bell, X, Home, LayoutDashboard, Users, ClipboardList } from 'lucide-react';

type AdminTab = 'performance' | 'services' | 'calendar' | 'messages' | 'reviews' | 'profile';

export default function AdminPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);

    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<AdminTab>('performance');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [impersonatedBricoler, setImpersonatedBricoler] = useState<{ id: string; name: string } | null>(null);
    const [showAdminBricolerCreator, setShowAdminBricolerCreator] = useState(false);
    const [showAdminNotifications, setShowAdminNotifications] = useState(false);
    const [showAdminReceivables, setShowAdminReceivables] = useState(false);

    // Auth guard: only admins can access this route
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace('/');
                return;
            }
            try {
                // Check both clients collection (role field) and users collection
                const clientSnap = await getDoc(doc(db, 'clients', user.uid));
                const userSnap = await getDoc(doc(db, 'users', user.uid));
                const isAdminUser =
                    clientSnap.exists() && clientSnap.data()?.role === 'admin' ||
                    userSnap.exists() && userSnap.data()?.role === 'admin';
                if (!isAdminUser) {
                    router.replace('/');
                    return;
                }
                setIsAdmin(true);
            } catch (err) {
                console.error('Admin check failed:', err);
                router.replace('/');
            } finally {
                setChecking(false);
            }
        });
        return () => unsub();
    }, [router]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FFCC02]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center">
                        <Shield size={32} className="text-[#FFCC02]" />
                    </div>
                    <p className="text-black font-bold text-lg">Checking access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFCC02] px-5 pt-safe-top">
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded-xl flex items-center justify-center">
                            <Shield size={16} className="text-[#FFCC02]" />
                        </div>
                        <span className="font-black text-black text-lg">Admin</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAdminNotifications(true)}
                            className="w-10 h-10 bg-black/10 rounded-2xl flex items-center justify-center relative"
                        >
                            <Bell size={20} className="text-black" />
                            <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#FFCC02]" />
                        </button>
                        <button
                            onClick={() => {
                                localStorage.setItem('lbricol_force_client_mode', 'true');
                                router.push('/');
                            }}
                            className="w-10 h-10 bg-black/10 rounded-2xl flex items-center justify-center"
                        >
                            <Home size={20} className="text-black" />
                        </button>
                    </div>
                </div>
                {/* Tab bar (desktop) */}
                {!isMobile && (
                    <div className="flex gap-1 pb-3 pt-1">
                        {[
                            { id: 'performance', label: t({ en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' }) },
                            { id: 'services', label: t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'المحترفون' }) },
                            { id: 'calendar', label: t({ en: 'Orders', fr: 'Commandes', ar: 'الطلبات' }) },
                            { id: 'reviews', label: t({ en: 'Reviews', fr: 'Avis', ar: 'التقييمات' }) },
                            { id: 'messages', label: t({ en: 'Messages', fr: 'Messages', ar: 'الرسائل' }) },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as AdminTab)}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${activeTab === tab.id ? 'bg-black text-[#FFCC02]' : 'bg-black/10 text-black hover:bg-black/20'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 ${isMobile ? 'pt-14 pb-24' : 'pt-24 pb-8'} w-full max-w-2xl mx-auto`}>
                {activeTab === 'performance' && (
                    <AdminDashboard t={t} />
                )}

                {activeTab === 'reviews' && (
                    <div className="px-0">
                        <AdminReviewsView />
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="px-0">
                        <AdminBricolersView t={t} />
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <AdminOrdersView
                        t={t}
                        onViewMessages={(jobId) => {
                            setSelectedOrderId(jobId);
                            setActiveTab('messages');
                        }}
                        onChat={(jobId, bricolerId, bricolerName) => {
                            setImpersonatedBricoler({ id: bricolerId, name: bricolerName });
                            setSelectedOrderId(jobId);
                            setActiveTab('messages');
                        }}
                    />
                )}

                {activeTab === 'messages' && (
                    <MessagesView
                        orders={[]}
                        currentUser={auth.currentUser}
                        initialSelectedJobId={selectedOrderId}
                        impersonateBricoler={impersonatedBricoler || undefined}
                        onBackToOrders={() => {
                            setActiveTab('calendar');
                            setImpersonatedBricoler(null);
                        }}
                    />
                )}
            </div>

            {/* Mobile bottom nav */}
            {isMobile && (
                <MobileBottomNav
                    activeTab={activeTab as any}
                    onTabChange={(tab: any) => setActiveTab(tab as AdminTab)}
                    variant="admin"
                />
            )}

            {/* Admin Bricoler Creator overlay */}
            <AnimatePresence>
                {showAdminBricolerCreator && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed inset-0 z-[1001] bg-white overflow-y-auto pt-12 px-5"
                    >
                        <div className="max-w-md mx-auto">
                            <button
                                onClick={() => setShowAdminBricolerCreator(false)}
                                className="mb-8 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center"
                            >
                                <X size={20} />
                            </button>
                            <AdminBricolerCreator t={t} onBack={() => setShowAdminBricolerCreator(false)} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notifications overlay */}
            <AnimatePresence>
                {showAdminNotifications && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1001] bg-white"
                    >
                        <AdminNotificationsView
                            onBack={() => setShowAdminNotifications(false)}
                            onNavigateToReceivables={() => {
                                setShowAdminNotifications(false);
                                setShowAdminReceivables(true);
                            }}
                        />
                    </motion.div>
                )}
                {showAdminReceivables && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1001] bg-white"
                    >
                        <AdminReceivablesView onBack={() => setShowAdminReceivables(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
