"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import MarketView from '@/features/provider/components/MarketView';
import { useData } from '@/context/DataContext';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProviderJobsPage() {
    const { currentUser, isBricoler, userData } = useAuth();
    const { marketJobs } = useData();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);
    const [dismissedJobIds, setDismissedJobIds] = useState<string[]>([]);

    if (!isBricoler) {
        return <div className="p-10">Access Denied. You must be a Bricoler to view this page.</div>;
    }

    const handleAcceptJob = async (job: any) => {
        if (!currentUser) return;
        try {
            const jobRef = doc(db, 'jobs', job.id);
            await updateDoc(jobRef, {
                status: 'accepted',
                bricolerId: currentUser.uid,
                acceptedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error accepting job:", e);
        }
    };

    const handleCounterOffer = (job: any) => {
        // Implement counter offer logic or redirect to chat
        console.log("Counter offer for:", job.id);
    };

    return (
        <div className="min-h-screen bg-[#F9F9F9]">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24 pt-4">
                <MarketView
                    jobs={marketJobs}
                    isLoading={false}
                    providerCity={userData?.city || ''}
                    onAcceptJob={handleAcceptJob}
                    onCounterClick={handleCounterOffer}
                    onViewDetails={(job: any) => { }}
                    dismissedJobIds={dismissedJobIds}
                    onDismissJob={(id: string) => setDismissedJobIds(prev => [...prev, id])}
                />
            </main>

            {isMobile && <MobileBottomNav variant="provider" />}
        </div>
    );
}
