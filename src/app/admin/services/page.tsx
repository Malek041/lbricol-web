"use client";

import React from 'react';
import AdminBricolersView from '@/features/admin/components/AdminBricolersView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';

export default function AdminServicesPage() {
    const { currentUser, isAdmin } = useAuth();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);

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
                <AdminBricolersView t={t} />
            </main>

            {isMobile && <MobileBottomNav variant="admin" />}
        </div>
    );
}
