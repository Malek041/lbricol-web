"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, CheckCheck, Gift } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ShareAndEarnViewProps {
    currentUser: any;
    onBack: () => void;
    onLogin: () => void;
}

const ShareAndEarnView: React.FC<ShareAndEarnViewProps> = ({
    currentUser,
    onBack,
    onLogin
}) => {
    const { t } = useLanguage();
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const REFERRER_REWARD = "15% DISCOUNT";
    const NEW_USER_DISCOUNT = "15%";

    useEffect(() => {
        const fetchOrGenerateCode = async () => {
            if (!currentUser) { setIsLoading(false); return; }
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                let code = '';
                if (userSnap.exists() && userSnap.data().referralCode) {
                    code = userSnap.data().referralCode;
                } else {
                    const namePart = (currentUser.displayName || currentUser.email || 'USR')
                        .substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
                    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
                    code = `${namePart}${randomPart}`;
                    await setDoc(userRef, { referralCode: code }, { merge: true });
                }
                setReferralCode(code);
            } catch (error) {
                console.error("Error fetching/generating code:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrGenerateCode();
    }, [currentUser]);

    const handleCopy = () => {
        if (!currentUser) { onLogin(); return; }
        if (!referralCode) return;
        const message = t({
            en: `Hey! Use my code ${referralCode} on Lbricol to get ${NEW_USER_DISCOUNT} off your first home service. Download the app: https://lbricol.com`,
            fr: `Hey ! Utilise mon code ${referralCode} sur Lbricol pour avoir ${NEW_USER_DISCOUNT} de réduction sur ton premier service à domicile. Télécharge l'appli : https://lbricol.com`,
            ar: `مرحباً! استخدم كود الإحالة ${referralCode} على لبريكول لتحصل على خصم ${NEW_USER_DISCOUNT} على أول خدمة منزلية. نزّل التطبيق: https://lbricol.com`
        });
        navigator.clipboard.writeText(message).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const steps = [
        {
            emoji: '📋',
            title: t({ en: 'Copy your code', fr: 'Copiez votre code', ar: 'انسخ الكود' }),
            desc: t({ en: 'Tap Copy and send it to a friend on WhatsApp or social', fr: 'Appuyez sur Copier et envoyez-le à un ami', ar: 'اضغط على نسخ ثم أرسله لصديق عبر واتساب أو الشبكات الاجتماعية' })
        },
        {
            emoji: '🛒',
            title: t({ en: 'Friend places an order', fr: 'L\'ami passe une commande', ar: 'الصديق يطلب خدمة' }),
            desc: t({ en: `They enter your code at checkout and get ${NEW_USER_DISCOUNT} off their first order`, fr: `Il entre votre code et obtient ${NEW_USER_DISCOUNT} de réduction sur sa première commande`, ar: `يدخل الكود عند الدفع ويحصل على خصم ${NEW_USER_DISCOUNT} على أول طلب` })
        },
        {
            emoji: '💰',
            title: t({ en: 'You earn credit', fr: 'Vous gagnez du crédit', ar: 'تربح رصيداً' }),
            desc: t({ en: `You get ${REFERRER_REWARD} credit added to your account for every friend that orders!`, fr: `Vous recevez ${REFERRER_REWARD} de crédit sur votre compte pour chaque ami qui commande !`, ar: `تحصل على رصيد ${REFERRER_REWARD} في حسابك مقابل كل صديق يطلب خدمة!` })
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-[100dvh] bg-[#FFFFFF] overflow-hidden"
        >
            {/* Header */}
            <div className="pt-12 px-5 pb-4 bg-[#FFFFFF] flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                    <ArrowLeft size={22} className="text-[#1D1D1D]" />
                </button>
                <span className="font-bold text-[18px] text-[#1D1D1D]">
                    {t({ en: 'Share and earn', fr: 'Partagez et gagnez', ar: 'شارك واربح' })}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-4">

                {/* Hero card */}
                <div className="bg-white rounded-[24px] px-6 pt-8 pb-8 flex flex-col items-center text-center">

                    {/* Jar Image */}
                    <motion.div
                        className="relative mb-6"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    >
                        <span className="absolute -top-3 left-0 text-[#FFC244] text-[18px] select-none">✦</span>
                        <span className="absolute top-1 -right-5 text-[#FFC244] text-[22px] select-none">✦</span>
                        <span className="absolute -bottom-2 right-2 text-[#FFC244] text-[13px] select-none">✦</span>
                        <div className="w-[200px] h-[200px] rounded-full flex items-center justify-center">
                            <Image
                                src="/Images/Share & Earn Pics/Share&earnJar.webp"
                                alt="Share and earn"
                                width={200}
                                height={200}
                                className="object-contain"
                            />
                        </div>
                    </motion.div>

                    <motion.h1
                        className="text-[35px] font-normal text-[#1D1D1D] leading-tight mb-3 max-w-[350px] text-center"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                    >
                        {t({ en: 'Get a ', fr: 'Obtenez une ', ar: 'احصل على ' })}
                        <strong className="font-black">{REFERRER_REWARD}</strong>
                        {t({ en: ' for each friend you refer', fr: ' pour chaque ami parrainé', ar: ' مقابل كل صديق تدعوه' })}
                        <br />
                        <span className="text-[22px] font-light text-neutral-400">{t({ en: 'Your friend gets ', fr: 'Votre ami obtient ', ar: 'صديقك يحصل على ' })}<strong className="font-black text-[#219178]">{NEW_USER_DISCOUNT} OFF</strong>{t({ en: ' their first order', fr: ' leur première commande', ar: ' خصماً على أول طلب' })}</span>
                    </motion.h1>

                    <motion.p
                        className="text-[16px] text-[#9B9B9B] mb-7"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.18, duration: 0.3 }}
                    >
                        {t({ en: 'Copy your invite code and send it to friends', fr: 'Copiez votre code et envoyez-le à vos amis', ar: 'انسخ كود الدعوة وأرسله إلى الأصدقاء' })}
                    </motion.p>

                    {/* Code + Copy pill */}
                    <motion.div
                        className="w-full flex items-center rounded-full bg-white border border-[#E0E0E0] shadow-[0_2px_10px_rgba(0,0,0,0.06)] overflow-hidden"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.22, type: 'spring', stiffness: 220, damping: 20 }}
                    >
                        {/* Code side */}
                        <div className="flex-1 px-5 py-4 text-left">
                            {isLoading ? (
                                <div className="h-5 w-24 bg-neutral-200 animate-pulse rounded" />
                            ) : currentUser ? (
                                <span className="font-black text-[19px] tracking-[0.15em] text-[#1D1D1D] uppercase">
                                    {referralCode}
                                </span>
                            ) : (
                                <span className="text-[15px] text-[#ABABAB]">
                                    {t({ en: 'Sign in to get code', fr: 'Connectez-vous pour voir le code', ar: 'سجّل الدخول للحصول على الكود' })}
                                </span>
                            )}
                        </div>

                        {/* Copy button */}
                        <button
                            onClick={handleCopy}
                            className={`px-6 py-4 font-bold text-[16px] flex items-center gap-2 transition-all active:scale-95 ${copied
                                ? 'text-white bg-[#219178]'
                                : 'text-[#219178] bg-[#219178]/5 hover:bg-[#219178]/10'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <CheckCheck size={18} />
                                    {t({ en: 'Copied!', fr: 'Copié !', ar: 'تم النسخ!' })}
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    {t({ en: 'Copy', fr: 'Copier', ar: 'نسخ' })}
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>

                {/* How it works */}
                <div className="bg-[#F9F9F9] rounded-[10px] px-6 py-6">
                    <h3 className="text-[18px] font-black text-black mb-5">
                        {t({ en: 'How it works', fr: 'Comment ça marche', ar: 'كيف تعمل' })}
                    </h3>
                    <div className="space-y-4">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-1xl bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0 text-[22px]">
                                    {step.emoji}
                                </div>
                                <div>
                                    <p className="text-[15px] font-semibold text-black">{step.title}</p>
                                    <p className="text-[13px] font-light text-neutral-400 mt-0.5 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fine print */}
                <p className="text-[13px] text-neutral-400 font-medium text-center px-4 leading-relaxed pb-2">
                    {t({
                        en: 'Each code can only be used once per new user. Credit is valid for 30 days. Cannot be combined with other offers.',
                        fr: 'Chaque code ne peut être utilisé qu\'une seule fois par nouvel utilisateur. Le crédit est valable 30 jours. Non cumulable avec d\'autres offres.',
                        ar: 'يمكن استخدام كل كود مرة واحدة فقط لكل مستخدم جديد. الرصيد صالح لمدة 30 يوماً ولا يمكن جمعه مع عروض أخرى.'
                    })}
                </p>

            </div>
        </motion.div>
    );
};

export default ShareAndEarnView;
