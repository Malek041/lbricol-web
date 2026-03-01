"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
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

    const RWD_AMOUNT = "20 MAD";

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

    const handleShare = async () => {
        if (!currentUser || !referralCode) { onLogin(); return; }
        const shareText = t({
            en: `Use my code ${referralCode} to get ${RWD_AMOUNT} off your first order on Lbricol!`,
            fr: `Utilisez mon code ${referralCode} pour bénéficier de ${RWD_AMOUNT} sur votre première commande Lbricol !`
        });
        if (navigator.share) {
            try { await navigator.share({ title: 'Lbricol', text: shareText }); }
            catch { copyToClipboard(); }
        } else { copyToClipboard(); }
    };

    const copyToClipboard = () => {
        if (!referralCode) return;
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col min-h-[100dvh] bg-[#FFFFFF]"
        >
            {/* Simple header — back arrow + title */}
            <div className="pt-12 px-5 pb-4 bg-[#FFFFFF] flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                >
                    <ArrowLeft size={22} className="text-[#1D1D1D]" />
                </button>
                <span className="font-bold text-[18px] text-[#1D1D1D]">
                    {t({ en: 'Share and earn', fr: 'Partagez et gagnez' })}
                </span>
            </div>

            {/* Main white card content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">

                {/* Hero card */}
                <div className="bg-white rounded-[24px]  px-6 pt-8 pb-8 flex flex-col items-center text-center">

                    {/* Jar Image in yellow circle */}
                    <motion.div
                        className="relative mb-6"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    >
                        {/* Sparkles */}
                        <span className="absolute -top-3 left-0 text-[#FFC244] text-[18px] select-none">✦</span>
                        <span className="absolute top-1 -right-5 text-[#FFC244] text-[22px] select-none">✦</span>
                        <span className="absolute -bottom-2 right-2 text-[#FFC244] text-[13px] select-none">✦</span>

                        <div className="w-[200px] h-[200px] rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}>
                            <Image
                                src="/Images/Share & Earn Pics/Share&earnJar.png"
                                alt="Share and earn"
                                width={200}
                                height={200}
                                className="object-contain"
                            />
                        </div>
                    </motion.div>

                    {/* Headline — amount is extra-bold, rest is regular weight */}
                    <motion.h1
                        className="text-[35px] font-normal text-[#1D1D1D] leading-tight mb-3 max-w-[350px] text-center"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                    >
                        {t({ en: 'Get ', fr: 'Obtenez ' })}
                        <strong className="font-black">{RWD_AMOUNT}</strong>
                        {t({ en: ' for each friend you refer', fr: ' pour chaque ami parrainé' })}
                    </motion.h1>

                    <motion.p
                        className="text-[16px] text-[#9B9B9B] mb-7"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.18, duration: 0.3 }}
                    >
                        {t({ en: 'Share your invite code', fr: 'Partagez votre code d\'invitation' })}
                    </motion.p>

                    {/* Code + Share pill — matches Pic 4 exactly */}
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
                                    {t({ en: 'Sign in to get code', fr: 'Connectez-vous pour voir le code' })}
                                </span>
                            )}
                        </div>



                        {/* Share button */}
                        <button
                            onClick={handleShare}
                            className="px-7 py-4 font-bold text-[25px] text-[#00A082] bg-[#00A082]/5 active:bg-[#00A082]/10 transition-colors whitespace-nowrap"
                        >
                            {copied
                                ? t({ en: 'Copied!', fr: 'Copié !' })
                                : t({ en: 'Share', fr: 'Partager' })
                            }
                        </button>
                    </motion.div>

                    {/* Fine print */}
                    <motion.p
                        className="mt-7 text-[16px] text-[#9B9B9B] leading-relaxed text-center max-w-[85%]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {t({
                            en: `Share your code with friends to get ${RWD_AMOUNT} off Services, valid for 21 days. When a friend place their first order, you'll get ${RWD_AMOUNT} off services, valid for 30 days.`,
                            fr: `Partagez votre code avec vos amis pour obtenir ${RWD_AMOUNT} de réduction, valable 21 jours. Lorsqu'un ami place leur première commande, vous obtenez ${RWD_AMOUNT} off services, valid for 30 days.`
                        })}
                    </motion.p>
                </div>


            </div>
        </motion.div>
    );
};

export default ShareAndEarnView;
