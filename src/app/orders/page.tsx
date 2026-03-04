"use client";

import React from 'react';
import ClientOrdersView from '@/features/orders/components/ClientOrdersView';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useIsMobileViewport } from '@/lib/mobileOnly';

import { useRouter } from 'next/navigation';

export default function OrdersPage() {
    const { currentUser, isBricoler } = useAuth();
    const { orders } = useData();
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
                <ClientOrdersView
                    orders={orders}
                    onViewMessages={(jobId) => router.push(`/messages/?jobId=${jobId}`)}
                    initialShowHistory={false}
                />
            </main>

            {isMobile && <MobileBottomNav variant="client" />}
        </div>
    );
}
