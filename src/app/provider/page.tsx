"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import ProviderOrdersView from '@/features/orders/components/ProviderOrdersView';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

export default function ProviderPage() {
    const { currentUser, isBricoler, isAdmin } = useAuth();
    const { acceptedJobs } = useData();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);
    const router = useRouter();

    if (!isBricoler && !isAdmin) {
        return <div className="p-10 text-center">Access Denied.</div>;
    }

    const handleViewMessages = (job: any) => {
        router.push(`/messages/?jobId=${job.id}`);
    };

    return (
        <div className="min-h-screen bg-[#F3F3F3]">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24">
                <ProviderOrdersView
                    orders={acceptedJobs}
                    currentUser={currentUser}
                    t={t}
                    onViewMessages={handleViewMessages}
                />
            </main>

            {isMobile && <MobileBottomNav variant={isBricoler ? 'provider' : 'client'} />}
        </div>
    );
}
