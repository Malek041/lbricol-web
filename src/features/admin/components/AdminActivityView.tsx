"use client";

import React, { useState } from 'react';
import AdminOrdersView from '@/features/orders/components/AdminOrdersView';
import AdminBricolersView from '@/features/admin/components/AdminBricolersView';
import { useLanguage } from '@/context/LanguageContext';

interface AdminActivityViewProps {
    t: (vals: { en: string; fr: string; ar?: string }) => string;
    onViewMessages?: (jobId: string) => void;
    onChat?: (jobId: string, bricolerId: string, bricolerName: string) => void;
}

export default function AdminActivityView({ t, onViewMessages, onChat }: AdminActivityViewProps) {
    const { language } = useLanguage();
    const [subTab, setSubTab] = useState<'orders' | 'bricolers'>('orders');

    return (
        <div className="flex flex-col h-[100dvh] bg-white pb-24">
            <div className="bg-white px-6 pt-4 pb-1 flex items-center justify-between sticky top-0 z-[40]">
                <div className="flex flex-col">
                    <span className="text-[26px] font-bold text-black leading-none tracking-tight">
                        {language === 'ar' ? 'النشاط' : language === 'fr' ? 'Activité' : 'Activity'}
                    </span>
                </div>
            </div>

            {/* Header Tabs */}
            <div className="flex border-b border-neutral-100 mb-2">
                <button
                    onClick={() => setSubTab('orders')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${subTab === 'orders' ? 'border-[#12B76A] text-[#12B76A]' : 'border-transparent text-neutral-400'}`}
                >
                    {t({ en: 'All Orders', fr: 'Toutes les commandes', ar: 'كل الطلبات' })}
                </button>
                <button
                    onClick={() => setSubTab('bricolers')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${subTab === 'bricolers' ? 'border-[#12B76A] text-[#12B76A]' : 'border-transparent text-neutral-400'}`}
                >
                    {t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'المحترفون' })}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {subTab === 'orders' ? (
                    <AdminOrdersView
                        t={t}
                        onViewMessages={onViewMessages}
                        onChat={onChat}
                        hideHeader
                    />
                ) : (
                    <div className="h-full overflow-y-auto">
                        <AdminBricolersView t={t} />
                    </div>
                )}
            </div>
        </div>
    );
}
