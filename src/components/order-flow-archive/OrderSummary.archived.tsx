// @ts-nocheck
// ARCHIVED — do not import this file in active pages.
// Extracted from: src/features/orders/components/OrderSubmissionFlow.tsx step4-review (March 2026)
// Use as reference when rebuilding the order flow from scratch.

"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getServiceById } from '@/config/services_config';

interface OrderSummaryProps {
    service: string;
    selectedDate: string | null;
    selectedTime: string | null;
    taskSize: string | null;
    activeSubService?: string;
    hourlyRate: number;
    calculatePrice: (hourlyRate: number, taskSize: string | null, serviceId: string, subService: string | null | undefined, options: any[]) => number;
}

/**
 * Order summary / pricing breakdown shown in step 4 (Review & Confirm) of the order flow.
 */
const OrderSummary: React.FC<OrderSummaryProps> = ({
    service,
    selectedDate,
    selectedTime,
    taskSize,
    activeSubService,
    hourlyRate,
    calculatePrice
}) => {
    const { t } = useLanguage();
    const serviceConfig = getServiceById(service);

    const totalPrice = calculatePrice(
        hourlyRate,
        taskSize,
        service,
        activeSubService,
        serviceConfig?.options || []
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-[22px] font-black text-neutral-900">
                    {t({ en: 'Review & Confirm', fr: 'Vérifier & Confirmer', ar: 'المراجعة والتأكيد' })}
                </h2>
                <p className="text-[14px] font-bold text-neutral-400">
                    {t({ en: 'Last step before booking', fr: 'Dernière étape avant la réservation', ar: 'الخطوة الأخيرة قبل الحجز' })}
                </p>
            </div>

            <div className="p-6 bg-neutral-50 rounded-[32px] space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                    <span className="font-black text-neutral-900">{serviceConfig?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">{t({ en: 'Date', fr: 'Date', ar: 'التاريخ' })}</span>
                    <span className="font-black text-neutral-900">{selectedDate}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-neutral-500 font-bold">{t({ en: 'Time', fr: 'Heure', ar: 'الوقت' })}</span>
                    <span className="font-black text-neutral-900">{selectedTime}</span>
                </div>
                <div className="pt-4 border-t border-neutral-200 flex justify-between items-center">
                    <span className="text-[18px] font-black text-neutral-950">
                        {t({ en: 'Total Price', fr: 'Prix Total', ar: 'السعر الإجمالي' })}
                    </span>
                    <span className="text-[24px] font-black text-[#219178]">MAD {totalPrice}</span>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;
