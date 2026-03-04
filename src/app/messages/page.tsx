"use client";

import React from 'react';
import MessagesView from '@/features/messages/components/MessagesView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useSearchParams, useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';

import { Suspense } from 'react';

function MessagesContent() {
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

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-[#00A082] border-t-transparent rounded-full animate-spin" /></div>}>
            <MessagesContent />
        </Suspense>
    );
}
