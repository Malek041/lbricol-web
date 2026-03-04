"use client";

import React from 'react';
import PromocodesView from '@/features/client/components/PromocodesView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';

export default function PromocodesPage() {
    const { currentUser, isBricoler } = useAuth();
    const isMobile = useIsMobileViewport(968);

    return (
        <div className="min-h-screen bg-white">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24">
                <PromocodesView />
            </main>

            {isMobile && <MobileBottomNav variant="client" />}
        </div>
    );
}
