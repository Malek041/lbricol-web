"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingPopup from '@/features/onboarding/components/OnboardingPopup';

export default function JoinPage() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-[#1D1D1D] mb-2">Join Lbricol</h1>
                <p className="text-neutral-500">Become a professional and start earning today.</p>
            </div>

            <OnboardingPopup
                isOpen={isOpen}
                mode="onboarding"
                onClose={() => {
                    setIsOpen(false);
                    router.push('/');
                }}
                onComplete={() => {
                    setIsOpen(false);
                    router.push('/provider');
                }}
            />
        </div>
    );
}
