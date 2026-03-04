"use client";

import React from 'react';
import ShareAndEarnView from '@/features/client/components/ShareAndEarnView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';

import { useRouter } from 'next/navigation';

export default function SharePage() {
    const { currentUser, isBricoler } = useAuth();
    const isMobile = useIsMobileViewport(968);
    const router = useRouter();

    return (
        <div className="min-h-screen bg-white">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24">
                <ShareAndEarnView
                    currentUser={currentUser}
                    onBack={() => router.back()}
                    onLogin={() => router.push('/login')}
                />
            </main>

            {isMobile && <MobileBottomNav variant="client" />}
        </div>
    );
}
