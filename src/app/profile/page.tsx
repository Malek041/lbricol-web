"use client";

import React from 'react';
import ProfileView from '@/features/provider/components/ProfileView';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { Suspense } from 'react';

function ProfileContent() {
    const { currentUser, userData, isAdmin, isBricoler } = useAuth();
    const { t } = useLanguage();
    const isMobile = useIsMobileViewport(968);
    const router = useRouter();
    const searchParams = useSearchParams();

    const viewParam = searchParams.get('view') as any;
    const initialView = ['main', 'info', 'admin-code', 'portfolio'].includes(viewParam) ? viewParam : 'main';

    const handleSetUserData = async (newData: any) => {
        if (!currentUser) return;
        try {
            const providerRef = doc(db, 'bricolers', currentUser.uid);
            await updateDoc(providerRef, newData);
        } catch (e) {
            console.error("Error updating user data:", e);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <Header
                activeTab="domestic"
                onTabChange={() => { }}
                isBricoler={isBricoler}
                user={currentUser}
            />

            <main className="pb-24">
                <ProfileView
                    userAvatar={userData?.photoURL || currentUser?.photoURL || undefined}
                    userName={userData?.name || currentUser?.displayName || undefined}
                    userEmail={currentUser?.email || undefined}
                    isBricoler={isBricoler}
                    isAuthenticated={!!currentUser}
                    onNavigate={(path) => router.push(path)}
                    isAdmin={isAdmin}
                    variant={isBricoler ? 'provider' : 'client'}
                    initialView={initialView}
                    userData={userData}
                    setUserData={handleSetUserData}
                />
            </main>

            {isMobile && <MobileBottomNav variant={isBricoler ? 'provider' : 'client'} />}
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-[#00A082] border-t-transparent rounded-full animate-spin" /></div>}>
            <ProfileContent />
        </Suspense>
    );
}
