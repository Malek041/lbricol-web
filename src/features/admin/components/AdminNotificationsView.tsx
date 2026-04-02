"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, DollarSign, Inbox, ChevronRight, CheckCircle2 } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { arSA, fr } from 'date-fns/locale';

export interface AdminNotification {
    id: string;
    type: 'commission_paid' | string;
    settlementId?: string;
    bricolerId?: string;
    bricolerName?: string;
    amount?: number;
    read: boolean;
    createdAt?: any;
}

interface AdminNotificationsViewProps {
    onBack: () => void;
    onNavigateToReceivables: () => void;
}

const AdminNotificationsView: React.FC<AdminNotificationsViewProps> = ({
    onBack,
    onNavigateToReceivables,
}) => {
    const { t, language } = useLanguage();
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const user = auth.currentUser;

    useEffect(() => {
        if (!user) { setIsLoading(false); return; }
        const q = query(collection(db, 'admin_notifications'));
        const unsub = onSnapshot(q, snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminNotification));
            docs.sort((a, b) => {
                const bDate = b.createdAt;
                const aDate = a.createdAt;
                const bTime = bDate?.toMillis ? bDate.toMillis() : (bDate ? new Date(bDate).getTime() : 0);
                const aTime = aDate?.toMillis ? aDate.toMillis() : (aDate ? new Date(aDate).getTime() : 0);
                return bTime - aTime;
            });
            setNotifications(docs);
            setIsLoading(false);
        }, () => setIsLoading(false));
        return unsub;
    }, [user?.uid]);

    useEffect(() => {
        if (!user || notifications.length === 0) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        const batch = writeBatch(db);
        unread.forEach(n => batch.update(doc(db, 'admin_notifications', n.id), { read: true }));
        batch.commit().catch(console.warn);
    }, [notifications.length]);

    const handleTap = (notif: AdminNotification) => {
        if (notif.type === 'commission_paid') {
            onNavigateToReceivables();
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const formatTime = (ts: any) => {
        if (!ts) return '';
        try {
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            const locale = language === 'fr' ? fr : language === 'ar' ? arSA : undefined;
            return formatDistanceToNow(date, { addSuffix: true, locale });
        } catch { return ''; }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-[100dvh] bg-white absolute top-0 left-0 right-0 z-[1001]"
        >
            <div className="pt-12 px-5 pb-4 bg-white sticky top-0 z-20 border-b border-neutral-100">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                    >
                        <ArrowLeft size={22} className="text-black" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-[20px] font-black text-black">
                            {t({ en: 'Admin Notifications', fr: 'Notifications Admin', ar: 'إشعارات المسؤول' })}
                        </h1>
                        {unreadCount > 0 && (
                            <p className="text-[13px] font-medium text-neutral-400">
                                {unreadCount} {t({ en: 'unread', fr: 'non lues', ar: 'غير مقروءة' })}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-neutral-100 rounded w-3/4" />
                                    <div className="h-3 bg-neutral-100 rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
                        <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-5">
                            <Inbox size={40} className="text-neutral-300" />
                        </div>
                        <h3 className="text-[20px] font-black text-black mb-2">
                            {t({ en: 'No notifications', fr: 'Aucune notification', ar: 'لا توجد إشعارات' })}
                        </h3>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-50">
                        <AnimatePresence>
                            {notifications.map((notif, i) => (
                                <motion.button
                                    key={notif.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    onClick={() => handleTap(notif)}
                                    className={cn(
                                        "w-full flex items-start gap-4 px-5 py-5 text-left transition-colors",
                                        !notif.read ? "bg-[#01A083]/[0.03]" : "bg-white",
                                        "hover:bg-neutral-50 active:bg-neutral-100"
                                    )}
                                >
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#E6F7F4] text-[#01A083]">
                                        <DollarSign size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-0.5">
                                            <p className={cn("text-[15px] leading-tight", notif.read ? "font-medium text-black" : "font-black text-black")}>
                                                {t({ en: 'Commission Paid', fr: 'Commission Payée', ar: 'عمولة مدفوعة' })}
                                            </p>
                                            {!notif.read && <div className="w-2 h-2 rounded-full bg-[#01A083] flex-shrink-0 mt-1.5" />}
                                        </div>
                                        <p className="text-[13px] font-medium text-neutral-500 leading-relaxed mt-0.5">
                                            {notif.bricolerName} {t({ en: 'has sent', fr: 'a envoyé', ar: 'أرسل' })} {notif.amount} MAD.
                                        </p>
                                        <p className="text-[12px] font-medium text-neutral-300 mt-2">
                                            {formatTime(notif.createdAt)}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-neutral-300 flex-shrink-0 mt-1" />
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AdminNotificationsView;
