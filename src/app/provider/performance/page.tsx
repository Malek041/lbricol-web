"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import AdminDashboard from '@/features/admin/components/AdminDashboard';
import { useLanguage } from '@/context/LanguageContext';

export default function ProviderPerformancePage() {
    const { currentUser, isBricoler } = useAuth();
    const isMobile = useIsMobileViewport(968);
    const { t } = useLanguage();

    if (!isBricoler) {
        return <div className="p-10">Access Denied. You must be a Bricoler to view this page.</div>;
    }

    return (
        <div className="min-h-screen bg-white">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24">
                {/* Provider typically uses a dashboard similar to admin but for their own data */}
                <AdminDashboard
                    t={t}
                    isProviderView={true}
                    providerId={currentUser?.uid}
                />
            </main>

            {isMobile && <MobileBottomNav variant="provider" />}
        </div>
    );
}
