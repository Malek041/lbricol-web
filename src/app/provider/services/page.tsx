"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import PromoteYourselfView from '@/features/provider/components/PromoteYourselfView';
import { useRouter } from 'next/navigation';

export default function ProviderServicesPage() {
    const { currentUser, isBricoler } = useAuth();
    const isMobile = useIsMobileViewport(968);
    const router = useRouter();

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
                <PromoteYourselfView
                    currentUser={currentUser}
                    onBack={() => router.back()}
                    onLogin={() => { }}
                />
            </main>

            {isMobile && <MobileBottomNav variant="provider" />}
        </div>
    );
}
