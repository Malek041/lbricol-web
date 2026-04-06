"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, CheckCheck, Users, Wrench } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface PromoteYourselfViewProps {
    currentUser: any;
    onBack: () => void;
    onLogin: () => void;
}

const PromoteYourselfView: React.FC<PromoteYourselfViewProps> = ({
    currentUser,
    onBack,
    onLogin
}) => {
    const { t, language } = useLanguage();
    const [clientCode, setClientCode] = useState<string | null>(null);
    const [bricolerCode, setBricolerCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedClient, setCopiedClient] = useState(false);
    const [copiedBricoler, setCopiedBricoler] = useState(false);

    useEffect(() => {
        const fetchOrGenerateCodes = async () => {
            if (!currentUser) { setIsLoading(false); return; }
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                let cCode = '';
                let bCode = '';

                const data = userSnap.exists() ? userSnap.data() : {};

                if (data.referralCode) {
                    cCode = data.referralCode;
                } else {
                    const namePart = (currentUser.displayName || currentUser.email || 'USR')
                        .substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
                    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
                    cCode = `${namePart}${randomPart}`;
                }

                if (data.bricolerReferralCode) {
                    bCode = data.bricolerReferralCode;
                } else {
                    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
                    bCode = `BRI_${randomPart}`;
                }

                if (!data.referralCode || !data.bricolerReferralCode) {
                    await setDoc(userRef, {
                        referralCode: cCode,
                        bricolerReferralCode: bCode
                    }, { merge: true });
                }

                setClientCode(cCode);
                setBricolerCode(bCode);
            } catch (error) {
                console.error("Error fetching/generating codes:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrGenerateCodes();
    }, [currentUser]);

    const handleCopyClient = () => {
        if (!currentUser) { onLogin(); return; }
        if (!clientCode) return;
        const message = language === 'ar'
            ? `مرحباً! استخدم كودي ${clientCode} في تطبيق Lbricol للحصول على خصم 15% على أول خدمة منزلية لك. حمل التطبيق: https://lbricol.com`
            : t({
                en: `Hey! Use my code ${clientCode} on Lbricol to get 15% off your first home service. Download the app: https://lbricol.com`,
                fr: `Hey ! Utilise mon code ${clientCode} sur Lbricol pour avoir 15% de réduction sur ton premier service à domicile. Télécharge l'appli : https://lbricol.com`
            });
        navigator.clipboard.writeText(message).then(() => {
            setCopiedClient(true);
            setTimeout(() => setCopiedClient(false), 2500);
        });
    };

    const handleCopyBricoler = () => {
        if (!currentUser) { onLogin(); return; }
        if (!bricolerCode) return;
        const message = language === 'ar'
            ? `هل أنت محترف؟ انضم إلى Lbricol باستخدام كودي ${bricolerCode} وسنربح كلانا 50 درهم! حمل التطبيق: https://lbricol.com`
            : t({
                en: `Are you a professional? Join Lbricol using my code ${bricolerCode} and we both earn 50 MAD! Download the app: https://lbricol.com`,
                fr: `Vous êtes professionnel ? Rejoignez Lbricol avec le code ${bricolerCode} et nous gagnons chacun 50 MAD ! Télécharge l'appli : https://lbricol.com`
            });
        navigator.clipboard.writeText(message).then(() => {
            setCopiedBricoler(true);
            setTimeout(() => setCopiedBricoler(false), 2500);
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full bg-[#F9F9F9] overflow-hidden"
        >
            {/* Header */}
            <div id="promote-header" className="pt-12 px-5 pb-4 bg-white flex items-center gap-4 sticky top-0 z-20 border-b border-neutral-100">
                <button
                    id="promote-back-button"
                    onClick={onBack}
                    className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                    <ArrowLeft size={22} className="text-[#1D1D1D]" />
                </button>
                <span className="font-bold text-[18px] text-[#1D1D1D]">
                    {t({ en: 'Promote yourself!', fr: 'Promouvez-vous !', ar: 'روج لنفسك!' })}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 space-y-6">

                {/* Clients Card */}
                <div id="refer-clients-card" className="bg-white rounded-[24px] px-6 py-6 border border-neutral-100">
                    <div className="w-12 h-12 rounded-full bg-[#E6F7F4] flex items-center justify-center mb-4">
                        <Users size={24} className="text-[#01A083]" />
                    </div>

                    <h2 className="text-[22px] font-black text-black mb-1">
                        {t({ en: 'Refer Clients', fr: 'Parrainez des clients', ar: 'دعوة العملاء' })}
                    </h2>
                    <p className="text-[14px] text-neutral-500 font-medium leading-relaxed mb-6">
                        {t({
                            en: 'Share your code with new clients. They get 15% off their first order, and you earn a 15% discount too!',
                            fr: 'Partagez votre code. Ils obtiennent 15% de réduction, et vous recevez aussi une remise de 15% !',
                            ar: 'شارك كودك مع عملاء جدد. يحصلون على خصم 15% على أول طلب لهم، وتحصل أنت أيضاً على خصم 15%!'
                        })}
                    </p>

                    <div className="w-full flex items-center rounded-2xl bg-neutral-50 border border-neutral-100 overflow-hidden">
                        <div className="flex-1 px-4 py-3 text-left">
                            {isLoading ? (
                                <div className="h-5 w-24 bg-neutral-200 animate-pulse rounded" />
                            ) : currentUser ? (
                                <span className="font-black text-[18px] tracking-[0.1em] text-black uppercase">
                                    {clientCode}
                                </span>
                            ) : (
                                <span className="text-[14px] text-neutral-400">
                                    {t({ en: 'Sign in to see code', fr: 'Connectez-vous pour voir', ar: 'سجل الدخول لرؤية الكود' })}
                                </span>
                            )}
                        </div>
                        <button
                            id="copy-client-code-button"
                            onClick={handleCopyClient}
                            className={cn(
                                "px-5 py-3 font-bold text-[15px] flex items-center gap-2 transition-all active:scale-95",
                                copiedClient ? 'bg-[#01A083] text-white' : 'bg-[#01A083]/10 text-[#01A083] hover:bg-[#01A083]/20'
                            )}
                        >
                            {copiedClient ? (
                                <><CheckCheck size={18} />{t({ en: 'Copied', fr: 'Copié', ar: 'تم النسخ' })}</>
                            ) : (
                                <><Copy size={18} />{t({ en: 'Copy', fr: 'Copier', ar: 'نسخ' })}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Bricolers Card */}
                <div id="refer-bricolers-card" className="bg-white rounded-[24px] px-6 py-6 border border-neutral-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="px-3 py-1 bg-[#FFF9E5] text-[#FFCC02] text-[11px] font-black rounded-full uppercase tracking-wider">
                            {t({ en: '50 MAD Reward', fr: '50 MAD Bonus', ar: 'مكافأة 50 درهم' })}
                        </div>
                    </div>

                    <div className="w-12 h-12 rounded-full bg-[#FFF9E5] flex items-center justify-center mb-4">
                        <Wrench size={24} className="text-[#FFCC02]" />
                    </div>

                    <h2 className="text-[22px] font-black text-black mb-1">
                        {t({ en: 'Refer Bricolers', fr: 'Parrainez des pros', ar: 'دعوة الحرفيين' })}
                    </h2>
                    <p className="text-[14px] text-neutral-500 font-medium leading-relaxed mb-6 pr-6">
                        {t({
                            en: 'Invite other professionals. You earn 50 MAD to your actual earnings once they complete their first job!',
                            fr: 'Invitez d\'autres professionnels. Vous gagnez 50 MAD en cash dès qu\'ils terminent leur première mission !',
                            ar: 'ادعُ محترفين آخرين. ستربح 50 درهماً تضاف إلى أرباحك الفعلية بمجرد إكمالهم لمهمتهم الأولى!'
                        })}
                    </p>

                    <div className="w-full flex items-center rounded-2xl bg-neutral-50 border border-neutral-100 overflow-hidden">
                        <div className="flex-1 px-4 py-3 text-left">
                            {isLoading ? (
                                <div className="h-5 w-24 bg-neutral-200 animate-pulse rounded" />
                            ) : currentUser ? (
                                <span className="font-black text-[18px] tracking-[0.1em] text-black uppercase">
                                    {bricolerCode}
                                </span>
                            ) : (
                                <span className="text-[14px] text-neutral-400">
                                    {t({ en: 'Sign in to see code', fr: 'Connectez-vous pour voir', ar: 'سجل الدخول لرؤية الكود' })}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleCopyBricoler}
                            className={cn(
                                "px-5 py-3 font-bold text-[15px] flex items-center gap-2 transition-all active:scale-95",
                                copiedBricoler ? 'bg-[#FFCC02] text-white' : 'bg-[#FFF9E5] text-[#FFBA33] hover:bg-[#FFCC02]/20'
                            )}
                        >
                            {copiedBricoler ? (
                                <><CheckCheck size={18} />{t({ en: 'Copied', fr: 'Copié', ar: 'تم النسخ' })}</>
                            ) : (
                                <><Copy size={18} />{t({ en: 'Copy', fr: 'Copier', ar: 'نسخ' })}</>
                            )}
                        </button>
                    </div>
                </div>

                <p className="text-[13px] text-neutral-400 font-medium text-center px-4 leading-relaxed pb-4 pt-4">
                    {t({
                        en: 'Client credit is applied automatically on checkout. Professional rewards are sent directly to your earnings balance.',
                        fr: 'Le crédit client est appliqué automatiquement à la commande. Les bonus pro sont envoyés directement dans vos gains.',
                        ar: 'يتم تطبيق رصيد العميل تلقائياً عند الدفع. يتم إرسال مكافآت المحترفين مباشرة إلى رصيد أرباحك.'
                    })}
                </p>

            </div>
        </motion.div>
    );
};

export default PromoteYourselfView;
