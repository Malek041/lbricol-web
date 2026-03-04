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

const AVAILABILITY_SLOTS = {
    Morning: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
    Afternoon: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'],
    Evening: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']
};

const TIME_SLOTS = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
];

import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProviderPage() {
    const { currentUser, isBricoler, isAdmin, userData: authUserData } = useAuth();
    const { acceptedJobs } = useData();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);
    const router = useRouter();

    const [activeTab, setActiveTab] = React.useState<'activity' | 'calendar' | 'availability'>('activity');
    const [horizontalSelectedDate, setHorizontalSelectedDate] = React.useState<Date>(new Date());
    const [selectedOrder, setSelectedOrder] = React.useState<any>(null);
    const [localUserData, setLocalUserData] = React.useState(authUserData);

    React.useEffect(() => {
        if (authUserData) setLocalUserData(authUserData);
    }, [authUserData]);

    if (!isBricoler && !isAdmin) {
        return <div className="p-10 text-center">Access Denied.</div>;
    }

    const handleSaveSlotsManual = async (dateKey: string, slots: any[]) => {
        if (!currentUser) return;
        try {
            const bricolerRef = doc(db, 'bricolers', currentUser.uid);
            const currentSlots = localUserData?.calendarSlots || {};
            const updatedSlots = { ...currentSlots, [dateKey]: slots };
            await updateDoc(bricolerRef, { calendarSlots: updatedSlots });
        } catch (error) {
            console.error("Error saving slots:", error);
        }
    };

    const handleConfirmJob = async (jobId: string) => {
        try {
            await updateDoc(doc(db, 'jobs', jobId), { providerConfirmed: true });
        } catch (error) {
            console.error("Error confirming job:", error);
        }
    };

    const handleRedistributeJob = async (order: any) => {
        try {
            await updateDoc(doc(db, 'jobs', order.id), { status: 'waiting', bricolerId: null, bricolerName: null });
            setSelectedOrder(null);
        } catch (error) {
            console.error("Error redistributing job:", error);
        }
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
                    onViewMessages={(jobId) => router.push(`/messages/?jobId=${jobId}`)}
                    onSelectOrder={setSelectedOrder}
                    userData={localUserData}
                    setUserData={setLocalUserData}
                    horizontalSelectedDate={horizontalSelectedDate}
                    setHorizontalSelectedDate={setHorizontalSelectedDate}
                    handleSaveSlotsManual={handleSaveSlotsManual}
                    AVAILABILITY_SLOTS={AVAILABILITY_SLOTS}
                    TIME_SLOTS={TIME_SLOTS}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onConfirmJob={handleConfirmJob}
                    onRedistributeJob={handleRedistributeJob}
                />
            </main>

            {isMobile && <MobileBottomNav variant={isBricoler ? 'provider' : 'client'} />}
        </div>
    );
}
