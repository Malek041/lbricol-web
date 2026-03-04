"use client";

import React from 'react';
import AdminOrdersView from '@/features/orders/components/AdminOrdersView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useRouter } from 'next/navigation';

export default function AdminOrdersPage() {
    const { currentUser, isAdmin } = useAuth();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);
    const router = useRouter();

    if (!isAdmin) {
        return <div className="p-10">Access Denied</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                user={currentUser}
            />

            <main className="pb-24">
                <AdminOrdersView
                    t={t}
                    onViewMessages={(jobId) => router.push(`/messages?jobId=${jobId}`)}
                    onChat={(jobId, bricolerId, bricolerName) => {
                        // For admin, we might need a specific impersonation flow in messages
                        router.push(`/messages?jobId=${jobId}&impersonate=${bricolerId}&name=${bricolerName}`);
                    }}
                />
            </main>

            {isMobile && <MobileBottomNav variant="admin" />}
        </div>
    );
}
