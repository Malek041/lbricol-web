"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Tag, Info, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PromocodesViewProps {
    currentUser: any;
    onBack: () => void;
}

const PromocodesView: React.FC<PromocodesViewProps> = ({
    currentUser,
    onBack,
}) => {
    const { t } = useLanguage();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [hasOrders, setHasOrders] = useState<boolean>(false);

    useEffect(() => {
        if (!currentUser) return;
        const fetchUserData = async () => {
            try {
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setBalance(userSnap.data().referralBalance || 0);
                }

                // Check if user has orders
                const ordersRef = collection(db, 'orders');
                const q = query(ordersRef, where('clientId', '==', currentUser.uid));
                const querySnapshot = await getDocs(q);
                setHasOrders(!querySnapshot.empty);
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };
        fetchUserData();
    }, [currentUser]);

    const handleApplyCode = async () => {
        if (!code.trim()) return;
        if (!currentUser) {
            setMessage({ text: t({ en: 'Please log in first.', fr: 'Veuillez vous connecter d\'abord.' }), type: 'error' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            const upperCode = code.trim().toUpperCase();

            // 1. Check if user already entered a code
            const currentUserRef = doc(db, 'users', currentUser.uid);
            const currentUserSnap = await getDoc(currentUserRef);
            const userData = currentUserSnap.data() || {};

            if (userData.referredBy) {
                setMessage({ text: t({ en: 'You have already used a referral code.', fr: 'Vous avez déjà utilisé un code de parrainage.' }), type: 'error' });
                setIsLoading(false);
                return;
            }

            if (userData.referralCode === upperCode) {
                setMessage({ text: t({ en: 'You cannot use your own code.', fr: 'Vous ne pouvez pas utiliser votre propre code.' }), type: 'error' });
                setIsLoading(false);
                return;
            }

            if (hasOrders) {
                setMessage({ text: t({ en: 'Referral codes are only for new users.', fr: 'Les codes de parrainage sont réservés aux nouveaux utilisateurs.' }), type: 'error' });
                setIsLoading(false);
                return;
            }

            // 2. Find the referrer by code
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('referralCode', '==', upperCode));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setMessage({ text: t({ en: 'Invalid promo code.', fr: 'Code promo invalide.' }), type: 'error' });
                setIsLoading(false);
                return;
            }

            const referrerDoc = querySnapshot.docs[0];
            const referrerId = referrerDoc.id;

            // 3. Mark current user as referred
            await setDoc(currentUserRef, {
                referredBy: referrerId,
                referralDiscountAvailable: 20 // Grant 20 MAD discount
            }, { merge: true });

            setMessage({ text: t({ en: 'Promo code applied! You get 20 MAD off your first order.', fr: 'Code promo appliqué ! Vous obtenez 20 MAD de réduction sur votre première commande.' }), type: 'success' });
            setCode('');

        } catch (error) {
            console.error(error);
            setMessage({ text: t({ en: 'An error occurred.', fr: 'Une erreur s\'est produite.' }), type: 'error' });
        } finally {
            setIsLoading(false);
        }
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
                    {t({ en: 'Promocodes', fr: 'Codes promo' })}
                </div>
                <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto w-full max-w-md mx-auto p-5">

                {/* Balance Card */}
                <div className="bg-[#00A082] rounded-[20px] p-6 text-white mb-6 shadow-md relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-white/80 font-medium text-[15px] mb-1">
                            {t({ en: 'Available Credit', fr: 'Crédit disponible' })}
                        </p>
                        <h2 className="text-[36px] font-black leading-tight">
                            {balance.toFixed(2)} MAD
                        </h2>
                        <p className="text-white/90 text-[13px] mt-4 max-w-[85%]">
                            {balance > 0
                                ? t({ en: 'This balance will be automatically applied to your next orders.', fr: 'Ce solde sera automatiquement appliqué à vos prochaines commandes.' })
                                : t({ en: 'Share your referral code with friends to earn credits!', fr: 'Partagez votre code de parrainage avec vos amis pour gagner des crédits !' })
                            }
                        </p>
                    </div>
                    <Tag size={120} className="absolute -bottom-6 -right-6 text-white opacity-10" strokeWidth={1} />
                </div>

                {/* Input Section */}
                <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#E6E6E6]">
                    <h3 className="text-[17px] font-bold text-[#1D1D1D] mb-4">
                        {t({ en: 'Add a promo code', fr: 'Ajouter un code promo' })}
                    </h3>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={t({ en: 'Enter code here', fr: 'Entrez le code ici' })}
                            className="flex-1 bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-[15px] font-medium text-[#1D1D1D] border border-transparent focus:border-[#00A082] focus:bg-white outline-none transition-all"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleApplyCode}
                            disabled={!code.trim() || isLoading}
                            className="bg-[#FFC244] text-[#1D1D1D] px-6 py-3.5 rounded-xl font-bold text-[15px] disabled:opacity-50 transition-colors"
                        >
                            {isLoading ? '...' : t({ en: 'Apply', fr: 'Appliquer' })}
                        </button>
                    </div>

                    {message && (
                        <div className={`mt-4 flex items-start gap-2 text-[14px] font-medium ${message.type === 'success' ? 'text-[#00A082]' : 'text-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <Info size={18} className="mt-0.5" />}
                            <p>{message.text}</p>
                        </div>
                    )}
                </div>

            </div>
        </motion.div>
    );
};

export default PromocodesView;
