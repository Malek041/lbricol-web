"use client";

import React, { useState } from 'react';
import { X, Star, RotateCcw, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { cn } from '@/lib/utils';
import WaveTop from '@/components/shared/WaveTop';

type State = 'offer' | 'counter' | 'agreed';

const NegotiationPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const [state, setState] = useState<State>('offer');
    const [lbricoler] = useState({ name: "Ahmed", rating: 4.8, jobs: 124, price: 150 });
    const [offerPrice, setOfferPrice] = useState(150);
    const isMobile = useIsMobileViewport(968);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F5F5F5' : '#111111',
        card: theme === 'light' ? '#F7F7F7' : '#111111',
        primary: '#01A083',
        onPrimary: '#FFFFFF'
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-6"
                    onClick={onClose}
                >
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className={cn(
                            "relative w-full max-w-[440px] shadow-2xl flex flex-col",
                            isMobile ? "rounded-t-[32px] min-h-0 pb-12 px-6 pt-0" : "rounded-[32px] p-10"
                        )}
                        style={{ backgroundColor: c.bg, color: c.text }}
                        onClick={e => e.stopPropagation()}
                    >
                        {isMobile && <WaveTop />}

                        {/* Native Handle for Mobile */}
                        {isMobile && (
                            <div className="w-12 h-1.5 bg-neutral-200/50 rounded-full mx-auto mt-4 mb-6 flex-shrink-0" />
                        )}

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                "absolute z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                isMobile ? "top-4 right-4" : "top-6 right-6"
                            )}
                            style={{ backgroundColor: c.surface, color: c.text }}
                        >
                            <X size={20} />
                        </button>

                <div style={{ padding: '0.5rem 0' }}>
                    <AnimatePresence mode="wait">
                        {state === 'offer' && (
                            <motion.div
                                key="offer"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1.5rem', color: c.text, letterSpacing: '-0.03em' }}>
                                    {t({ en: 'New Offer Received', fr: 'Nouvelle offre reçue', ar: 'عرض جديد مستلم' })}
                                </h3>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1.25rem',
                                    backgroundColor: c.card,
                                    borderRadius: '20px',
                                    marginBottom: '2rem',
                                    border: `1px solid ${c.border}`
                                }}>
                                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: c.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={28} color={c.textMuted} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 900, fontSize: '17px', color: c.text }}>{lbricoler.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 800 }}>
                                            <Star size={14} fill={c.text} />
                                            <span>{lbricoler.rating}</span>
                                            <span style={{ color: c.textMuted, fontWeight: 500 }}>({lbricoler.jobs} {t({ en: 'jobs', fr: 'jobs', ar: 'مهام' })})</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2.5rem' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 900, color: c.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                                        {t({ en: 'PRICE PROPOSAL', fr: 'PROPOSITION DE PRIX', ar: 'اقتراح السعر' })}
                                    </div>
                                    <div style={{ fontSize: '3.5rem', fontWeight: 900, letterSpacing: '-0.05em', color: c.text }}>
                                        {lbricoler.price} <span style={{ fontSize: '1.5rem' }}>MAD</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button
                                        onClick={() => setState('agreed')}
                                        style={{
                                            padding: '18px',
                                            backgroundColor: c.primary,
                                            color: c.onPrimary,
                                            borderRadius: '16px',
                                            fontWeight: 900,
                                            fontSize: '17px',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t({ en: 'Accept Offer', fr: "Accepter l'offre", ar: 'قبول العرض' })}
                                    </button>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <button
                                            onClick={() => setState('counter')}
                                            style={{
                                                padding: '16px',
                                                backgroundColor: c.surface,
                                                color: c.text,
                                                borderRadius: '16px',
                                                fontWeight: 900,
                                                fontSize: '15px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <RotateCcw size={18} /> {t({ en: 'Counter', fr: 'Contre-offre', ar: 'عرض مقابل' })}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            style={{
                                                padding: '16px',
                                                backgroundColor: c.surface,
                                                color: c.text,
                                                borderRadius: '16px',
                                                fontWeight: 900,
                                                fontSize: '15px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t({ en: 'Decline', fr: 'Décliner', ar: 'رفض' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {state === 'counter' && (
                            <motion.div
                                key="counter"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem', color: c.text }}>
                                    {t({ en: 'Propose your price', fr: 'Proposez votre prix', ar: 'اقترح سعرك' })}
                                </h3>
                                <div style={{ backgroundColor: c.card, borderRadius: '24px', padding: '2.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${c.border}` }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={offerPrice}
                                            onChange={(e) => setOfferPrice(Number(e.target.value))}
                                            style={{
                                                backgroundColor: 'transparent',
                                                textAlign: 'center',
                                                fontSize: '4.5rem',
                                                fontWeight: 900,
                                                border: 'none',
                                                outline: 'none',
                                                width: '160px',
                                                color: c.text,
                                                letterSpacing: '-0.05em'
                                            }}
                                            autoFocus
                                        />
                                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: c.textMuted }}>{t({ en: 'MAD', fr: 'MAD', ar: 'د.م.' })}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button
                                        onClick={() => setState('agreed')}
                                        style={{
                                            padding: '18px',
                                            backgroundColor: c.primary,
                                            color: c.onPrimary,
                                            borderRadius: '16px',
                                            fontWeight: 900,
                                            fontSize: '17px',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t({ en: 'Send Counter-offer', fr: 'Envoyer la contre-offre', ar: 'إرسال عرض مقابل' })}
                                    </button>
                                    <button
                                        onClick={() => setState('offer')}
                                        style={{
                                            padding: '16px',
                                            backgroundColor: 'transparent',
                                            color: c.text,
                                            fontWeight: 900,
                                            fontSize: '15px',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t({ en: 'Back to offer', fr: "Retour à l'offre", ar: 'العودة للعرض' })}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {state === 'agreed' && (
                            <motion.div
                                key="agreed"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}
                            >
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    backgroundColor: c.primary,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '2rem'
                                }}>
                                    <User size={40} color={c.onPrimary} />
                                </div>
                                <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: c.text, letterSpacing: '-0.03em' }}>
                                    {t({ en: 'Deal Confirmed!', fr: 'Accord confirmé !', ar: 'تم الاتفاق!' })}
                                </h3>
                                <p style={{ color: c.textMuted, fontSize: '17px', fontWeight: 500, lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '280px' }}>
                                    {t({
                                        en: `${lbricoler.name} is on his way. You can now chat to finalize details.`,
                                        fr: `${lbricoler.name} est en route. Vous pouvez maintenant discuter pour finaliser les détails.`,
                                        ar: `${lbricoler.name} في طريقه إليك. يمكنك الآن الدردشة لإنهاء التفاصيل.`
                                    })}
                                </p>
                                <button
                                    onClick={onClose}
                                    style={{
                                        width: '100%',
                                        padding: '18px',
                                        backgroundColor: c.primary,
                                        color: c.onPrimary,
                                        borderRadius: '16px',
                                        fontWeight: 900,
                                        fontSize: '17px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t({ en: 'Proceed to Dashboard', fr: 'Tableau de bord', ar: 'الذهاب للوحة التحكم' })}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NegotiationPopup;
