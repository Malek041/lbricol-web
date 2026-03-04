"use client";

import React from 'react';
import MessagesView from '@/features/messages/components/MessagesView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useSearchParams, useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';

export default function MessagesPage() {
    const { currentUser, isBricoler } = useAuth();
    const { orders } = useData();
    const isMobile = useIsMobileViewport(968);
    const searchParams = useSearchParams();
    const router = useRouter();

    const jobId = searchParams.get('jobId');
    const impersonateId = searchParams.get('impersonate');
    const impersonateName = searchParams.get('name');

    return (
        <div className="min-h-screen bg-white">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24">
                <MessagesView
                    orders={orders}
                    currentUser={currentUser}
                    initialSelectedJobId={jobId || undefined}
                    impersonateBricoler={impersonateId ? { id: impersonateId, name: impersonateName || '' } : undefined}
                    onBackToOrders={() => router.push('/orders')}
                />
            </main>

            {isMobile && <MobileBottomNav variant={isBricoler ? 'provider' : 'client'} />}
        </div>
    );
}
