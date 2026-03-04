"use client";

import React from 'react';
import AdminNotificationsView from '@/features/admin/components/AdminNotificationsView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useRouter } from 'next/navigation';

export default function AdminNotificationsPage() {
    const { currentUser, isAdmin } = useAuth();
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
                <AdminNotificationsView
                    onBack={() => router.back()}
                    onNavigateToReceivables={() => router.push('/admin/receivables')}
                />
            </main>

            {isMobile && <MobileBottomNav variant="admin" />}
        </div>
    );
}
