"use client";

import React from 'react';
import HeroesView from '@/features/client/components/HeroesView';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';

export default function HeroesPage() {
    const { currentUser, isBricoler } = useAuth();
    const { orders } = useData();
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
                <HeroesView orders={orders} />
            </main>

            {isMobile && <MobileBottomNav variant="client" />}
        </div>
    );
}
