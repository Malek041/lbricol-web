"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bell, CheckCircle2, MessageCircle, Package, Gift, Clock, ChevronRight, Inbox } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, writeBatch, limit } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { arSA, fr } from 'date-fns/locale';

export interface ClientNotification {
    id: string;
    type: 'order_programmed' | 'order_confirmed' | 'order_delivered' | 'referral_reward' | 'job_status_update' | 'bricoler_offer' | 'bricoler_counter_offer';
    title?: string;
    body?: string;
    orderId?: string;
    jobId?: string;
    bricolerId?: string;
    bricolerName?: string;
    serviceName?: string;
    text?: string;
    price?: number;
    status?: string;
    senderName?: string;
    read: boolean;
    createdAt?: any;
    timestamp?: any;
}

interface ClientNotificationsViewProps {
    onBack: () => void;
    onNavigateToOrder?: (orderId: string) => void;
    onNavigateToMessages?: (orderId: string) => void;
}

const TYPE_CONFIG: Record<ClientNotification['type'], { icon: React.ElementType; color: string; bg: string }> = {
    order_programmed: { icon: Package, color: '#01A083', bg: '#E6F7F4' },
    order_confirmed: { icon: CheckCircle2, color: '#01A083', bg: '#E6F7F4' },
    order_delivered: { icon: CheckCircle2, color: '#FFC244', bg: '#FFF9ED' },
    // new_message type removed - using WhatsApp only
    referral_reward: { icon: Gift, color: '#E91E8C', bg: '#FCE4F1' },
    job_status_update: { icon: Clock, color: '#01A083', bg: '#E6F7F4' },
    bricoler_offer: { icon: CheckCircle2, color: '#01A083', bg: '#E6F7F4' },
    bricoler_counter_offer: { icon: CheckCircle2, color: '#FFC244', bg: '#FFF9ED' },
};

const ClientNotificationsView: React.FC<ClientNotificationsViewProps> = ({
    onBack,
    onNavigateToOrder,
    onNavigateToMessages,
}) => {
    const { t, language } = useLanguage();
    const [notifications, setNotifications] = useState<ClientNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const user = auth.currentUser;

    // Real-time listener
    useEffect(() => {
        if (!user) { setIsLoading(false); return; }
        const q = query(
            collection(db, 'client_notifications'),
            where('clientId', '==', user.uid)
        );
        const unsub = onSnapshot(q, snap => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClientNotification));
            // Sort client-side to avoid index requirement
            docs.sort((a, b) => {
                const bDate = b.createdAt || b.timestamp;
                const aDate = a.createdAt || a.timestamp;
                const bTime = bDate?.toMillis ? bDate.toMillis() : (bDate ? new Date(bDate).getTime() : 0);
                const aTime = aDate?.toMillis ? aDate.toMillis() : (aDate ? new Date(aDate).getTime() : 0);
                return bTime - aTime;
            });
            setNotifications(docs);
            setIsLoading(false);
        }, () => setIsLoading(false));
        return unsub;
    }, [user?.uid]);

    // Mark all as read when view opens
    useEffect(() => {
        if (!user || notifications.length === 0) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        const batch = writeBatch(db);
        unread.forEach(n => batch.update(doc(db, 'client_notifications', n.id), { read: true }));
        batch.commit().catch(console.warn);
    }, [notifications.length]);

    const handleTap = (notif: ClientNotification) => {
        const id = notif.orderId || notif.jobId;
        if (id) {
            onNavigateToOrder?.(id);
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

    const getTitle = (notif: ClientNotification, t: any) => {
        if (notif.title) return notif.title;
        switch (notif.type) {
            // new_message case removed
            case 'job_status_update': return t({ en: 'Order Status Update', fr: 'Mise à jour du statut', ar: 'تحديث حالة الطلب' });
            case 'bricoler_offer': return t({ en: 'New Offer Received', fr: 'Nouvelle offre reçue', ar: 'تم استلام عرض جديد' });
            case 'bricoler_counter_offer': return t({ en: 'New Counter Offer', fr: 'Nouvelle contre-offre', ar: 'عرض مقابل جديد' });
            default: return t({ en: 'Notification', fr: 'Notification', ar: 'إشعار' });
        }
    };

    const getBody = (notif: ClientNotification, t: any) => {
        if (notif.body) return notif.body;
        switch (notif.type) {
            // new_message case removed
            case 'job_status_update':
                return t({
                    en: `${notif.serviceName} is now ${notif.status}`,
                    fr: `${notif.serviceName} est maintenant ${notif.status}`,
                    ar: `${notif.serviceName} حالته الآن ${notif.status}`
                });
            case 'bricoler_offer':
                return t({
                    en: `${notif.bricolerName} has sent an offer for ${notif.serviceName}`,
                    fr: `${notif.bricolerName} a envoyé une offre pour ${notif.serviceName}`,
                    ar: `${notif.bricolerName} أرسل عرضاً لـ ${notif.serviceName}`
                });
            case 'bricoler_counter_offer':
                return t({
                    en: `${notif.bricolerName} counter-offered ${notif.price} MAD for ${notif.serviceName}`,
                    fr: `${notif.bricolerName} a proposé ${notif.price} MAD pour ${notif.serviceName}`,
                    ar: `${notif.bricolerName} قدم عرضاً مقابلاً بـ ${notif.price} درهم لـ ${notif.serviceName}`
                });
            default: return '';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col min-h-[100dvh] bg-white"
        >
            {/* Header */}
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
                            {t({ en: 'Notifications', fr: 'Notifications', ar: 'الإشعارات' })}
                        </h1>
                        {unreadCount > 0 && (
                            <p className="text-[13px] font-medium text-neutral-400">
                                {unreadCount} {t({ en: 'unread', fr: 'non lues', ar: 'غير مقروءة' })}
                            </p>
                        )}
                    </div>
                    <Bell size={22} className="text-neutral-300" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-neutral-100 rounded w-3/4" />
                                    <div className="h-3 bg-neutral-100 rounded w-full" />
                                    <div className="h-3 bg-neutral-100 rounded w-1/2" />
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
                            {t({ en: 'No notifications yet', fr: 'Pas encore de notifications', ar: 'لا توجد إشعارات بعد' })}
                        </h3>
                        <p className="text-[15px] font-medium text-neutral-400 leading-relaxed">
                            {t({ en: 'Updates about your orders and referrals will appear here.', fr: 'Les mises à jour sur vos commandes et parrainages apparaîtront ici.', ar: 'ستظهر هنا تحديثات طلباتك وبرامج الإحالة.' })}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-50">
                        <AnimatePresence>
                            {notifications.map((notif, i) => {
                                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.order_programmed;
                                const IconComp = cfg.icon;
                                const isActionable = !!(notif.orderId || notif.jobId);

                                return (
                                    <motion.button
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => handleTap(notif)}
                                        className={cn(
                                            "w-full flex items-start gap-4 px-5 py-5 text-left transition-colors",
                                            !notif.read ? "bg-[#01A083]/[0.03]" : "bg-white",
                                            isActionable ? "hover:bg-neutral-50 active:bg-neutral-100" : "cursor-default"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: cfg.bg }}
                                        >
                                            <IconComp size={22} style={{ color: cfg.color }} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                <p className={cn("text-[15px] leading-tight", notif.read ? "font-medium text-black" : "font-black text-black")}>
                                                    {getTitle(notif, t)}
                                                </p>
                                                {!notif.read && (
                                                    <div className="w-2 h-2 rounded-full bg-[#01A083] flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-[13px] font-medium text-neutral-500 leading-relaxed mt-0.5">
                                                {getBody(notif, t)}
                                            </p>
                                            <p className="text-[12px] font-medium text-neutral-300 mt-2">
                                                {formatTime(notif.createdAt || notif.timestamp)}
                                            </p>
                                        </div>

                                        {isActionable && (
                                            <ChevronRight size={18} className="text-neutral-300 flex-shrink-0 mt-1" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default ClientNotificationsView;

// ── Helper to send a client notification from anywhere ─────────────────────
import { addDoc, serverTimestamp } from 'firebase/firestore';

export async function sendClientNotification({
    clientId,
    type,
    title,
    body,
    orderId,
    bricolerId,
    bricolerName,
}: {
    clientId: string;
    type: ClientNotification['type'];
    title: string;
    body: string;
    orderId?: string;
    bricolerId?: string;
    bricolerName?: string;
}) {
    try {
        await addDoc(collection(db, 'client_notifications'), {
            clientId,
            type,
            title,
            body,
            orderId: orderId || null,
            bricolerId: bricolerId || null,
            bricolerName: bricolerName || null,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (e) {
        console.warn('sendClientNotification failed:', e);
    }
}
