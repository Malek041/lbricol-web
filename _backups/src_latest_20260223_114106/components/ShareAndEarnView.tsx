"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ShareAndEarnViewProps {
    currentUser: any; // Firebase user
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
            if (!currentUser) {
                setIsLoading(false);
                return;
            }

            try {
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                let code = '';
                if (userSnap.exists() && userSnap.data().referralCode) {
                    code = userSnap.data().referralCode;
                } else {
                    // Generate new 6-character code
                    const namePart = (currentUser.displayName || currentUser.email || 'USR').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(3, 'X');
                    const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
                    code = `${namePart}${randomPart}`;

                    // Save to user doc
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
        if (!currentUser || !referralCode) {
            onLogin();
            return;
        }

        const shareText = t({
            en: `Use my code ${referralCode} to get ${RWD_AMOUNT} off your first order on Lbricol!`,
            fr: `Utilisez mon code ${referralCode} pour obtenir ${RWD_AMOUNT} de réduction sur votre première commande Lbricol !`
        });

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Lbricol',
                    text: shareText,
                });
            } catch (error) {
                console.log('Error sharing:', error);
                // Fallback to copy
                copyToClipboard();
            }
        } else {
            // Fallback for desktop/unsupported
            copyToClipboard();
        }
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
            className="flex flex-col min-h-[100dvh] bg-[#F7F7F7] relative pb-24"
        >
            {/* Header */}
            <div className="pt-12 px-5 pb-4 bg-white sticky top-0 z-20 flex items-center justify-between shadow-sm">
                <button
                    onClick={onBack}
                    className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5"
                >
                    <ArrowLeft size={24} className="text-[#1D1D1D]" />
                </button>
                <div className="font-bold text-[17px] text-[#1D1D1D]">
                    {t({ en: 'Share and earn', fr: 'Partagez et gagnez' })}
                </div>
                <div className="w-10" /> {/* Balancer */}
            </div>

            <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto">
                {/* Main Hero Section */}
                <div className="bg-white px-6 pb-10 rounded-b-[24px] shadow-sm flex flex-col items-center text-center">

                    {/* Gift Icon Graphic */}
                    <div className="relative mt-8 mb-6">
                        <div className="w-24 h-24 rounded-full bg-[#FFC244]/20 flex items-center justify-center border-[3px] border-[#FFC244]/40 relative z-10">
                            <Gift size={48} className="text-[#00A082]" strokeWidth={1.5} />
                        </div>
                        {/* Sparkles simulate */}
                        <div className="absolute -top-2 -left-4 text-[#FFC244] text-xl">✨</div>
                        <div className="absolute top-4 -right-6 text-[#FFC244] text-2xl">✨</div>
                        <div className="absolute -bottom-2 right-0 text-[#FFC244] text-sm">✨</div>
                    </div>

                    <h1 className="text-[26px] font-black text-[#1D1D1D] leading-tight mb-2">
                        {t({
                            en: `Get ${RWD_AMOUNT} for each friend you refer`,
                            fr: `Obtenez ${RWD_AMOUNT} pour chaque ami parrainé`
                        })}
                    </h1>

                    <p className="text-[15px] font-medium text-[#717171] mb-8">
                        {t({ en: 'Share your invite code', fr: 'Partagez votre code d\'invitation' })}
                    </p>

                    {/* Code & Share Pill */}
                    <div className="w-full flex items-center justify-between rounded-full border border-[#E6E6E6] shadow-sm p-1.5 focus-within:border-[#00A082] transition-colors bg-white">
                        <div className="flex-1 px-4 text-left">
                            {isLoading ? (
                                <div className="h-4 w-20 bg-neutral-200 animate-pulse rounded"></div>
                            ) : currentUser ? (
                                <span className="font-black text-[16px] tracking-wider text-[#1D1D1D]">
                                    {referralCode}
                                </span>
                            ) : (
                                <span className="text-[14px] text-[#B3B3B3] font-medium">
                                    {t({ en: 'Sign in to get code', fr: 'Connectez-vous pour le code' })}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleShare}
                            className={`px-6 py-3 rounded-full font-bold text-[15px] transition-all ${copied
                                    ? 'bg-neutral-100 text-[#1D1D1D]'
                                    : 'bg-[#00A082]/10 text-[#00A082] hover:bg-[#00A082]/20'
                                }`}
                        >
                            {copied
                                ? t({ en: 'Copied!', fr: 'Copié !' })
                                : t({ en: 'Share', fr: 'Partager' })
                            }
                        </button>
                    </div>

                    {/* Terms/Limits text */}
                    <p className="mt-8 text-[13px] text-[#717171] leading-relaxed max-w-[90%] mx-auto">
                        {t({
                            en: `Share your code with friends to give them ${RWD_AMOUNT} off products (limited to ${RWD_AMOUNT} per order), valid for 21 days on their first order. When they place their first order, you'll get ${RWD_AMOUNT} off products, valid for 30 days.`,
                            fr: `Partagez votre code avec vos amis pour leur offrir ${RWD_AMOUNT} de réduction (limité à ${RWD_AMOUNT} par commande), valable 21 jours sur leur première commande. Lorsqu'ils passeront leur première commande, vous obtiendrez ${RWD_AMOUNT} de réduction, valable 30 jours.`
                        })}
                    </p>
                </div>

                {/* How it works Card */}
                <div className="mt-6 mx-5 bg-white rounded-[24px] p-6 shadow-sm border border-[#E6E6E6]">
                    <h2 className="text-[18px] font-bold text-[#1D1D1D] mb-5 text-center">
                        {t({ en: 'How it works', fr: 'Comment ça marche' })}
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1D1D1D] flex-shrink-0"></span>
                            <p className="text-[15px] text-[#4A4A4A] leading-snug">
                                {t({ en: 'Share your code with friends and they\'ll each get ', fr: 'Partagez votre code avec vos amis et chacun obtiendra ' })}
                                <span className="font-bold text-[#1D1D1D]">{t({ en: 'money ', fr: 'de l\'argent ' })}</span>
                                {t({ en: 'to spend across ', fr: 'à dépenser sur ' })}
                                <span className="font-bold text-[#1D1D1D]">{t({ en: 'their orders.', fr: 'leurs commandes.' })}</span>
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1D1D1D] flex-shrink-0"></span>
                            <p className="text-[15px] text-[#4A4A4A] leading-snug">
                                {t({ en: 'Earn ', fr: 'Gagnez ' })}
                                <span className="font-bold text-[#1D1D1D]">{t({ en: 'money ', fr: 'de l\'argent ' })}</span>
                                {t({ en: 'to spend in Lbricol ', fr: 'à dépenser sur Lbricol ' })}
                                <span className="font-bold text-[#1D1D1D]">{t({ en: 'for every friend ', fr: 'pour chaque ami ' })}</span>
                                {t({ en: 'that places their first order.', fr: 'qui passe sa première commande.' })}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button className="text-[#00A082] font-bold text-[15px] hover:underline">
                            {t({ en: 'More info', fr: 'Plus d\'infos' })}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ShareAndEarnView;
