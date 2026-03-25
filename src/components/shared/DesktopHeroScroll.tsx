"use client";
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

const SLIDES = [
    {
        id: 'errands',
        title: { en: 'Errands', fr: 'Courses', ar: 'قضاء الحاجات' },
        desc: {
            en: 'Need groceries, pharmacy pickups, or a quick drop-off? Order it done from your couch.',
            fr: 'Courses, pharmacie ou dépôt rapide ? Commandez depuis votre canapé en quelques étapes.',
            ar: 'هل تحتاج إلى بقالة، أو اقتناء أدوية، أو توصيل سريع؟ اطلب ذلك وأنت مرتاح في منزلك.'
        },
        img: '/Images/Desktop hero section images/Errands.webp',
        titleColor: '#31735a',
        btnBg: '#31735a',
        btnTextColor: '#ffffff',
    },
    {
        id: 'babysitting',
        title: { en: 'Babysitting', fr: 'Garde d\'enfants', ar: 'جليسة أطفال' },
        desc: {
            en: 'Find trusted, vetted babysitters available today. Book in minutes, relax all day.',
            fr: 'Trouvez des baby-sitters de confiance disponibles aujourd\'hui. Réservez en quelques minutes.',
            ar: 'ابحث عن جليسات أطفال موثوقات ومدققات متوفرات اليوم. احجز في دقائق واسترخِ طوال اليوم.'
        },
        img: '/Images/Desktop hero section images/baybsetting.webp',
        titleColor: '#f24cb0',
        btnBg: '#f24cb0',
        btnTextColor: '#ffffff',
    },
    {
        id: 'gardening',
        title: { en: 'Gardening', fr: 'Jardinage', ar: 'بستنة' },
        desc: {
            en: 'Lawn mowing, planting, trimming — your garden transformed by a local expert.',
            fr: 'Tonte, plantation, taille — votre jardin transformé par un expert local.',
            ar: 'قص العشب، الزراعة، التقليم — حديقتك تتحول على يد خبير محلي.'
        },
        img: '/Images/Desktop hero section images/Gardening.webp',
        titleColor: '#76bbf8',
        btnBg: '#76bbf8',
        btnTextColor: '#ffffff',
    },
    {
        id: 'driver',
        title: { en: 'Driver', fr: 'Chauffeur', ar: 'سائق خاص' },
        desc: {
            en: 'Book a professional private driver by the hour or day — comfortable, reliable, on time.',
            fr: 'Réservez un chauffeur privé professionnel à l\'heure ou à la journée — confortable et ponctuel.',
            ar: 'احجز سائقاً خاصاً محترفاً بالساعة أو باليوم — مريح، موثوق، وفي الموعد.'
        },
        img: '/Images/Desktop hero section images/Driver.gif',
        titleColor: '#ffffff',
        btnBg: '#111111',
        btnTextColor: '#ffffff',
    },
    {
        id: 'pets_care',
        title: { en: 'Pets Care', fr: 'Animaux', ar: 'رعاية الحيوانات' },
        desc: {
            en: 'Daily walks, pet sitting, grooming — caring hands for your furry family members.',
            fr: 'Promenades, garde, toilettage — des mains attentionnées pour vos animaux de compagnie.',
            ar: 'تمشية يومية، مجالسة الحيوانات، تنظيف وتجميل — أيدٍ حانية لأفراد عائلتك الأليفة.'
        },
        img: '/Images/Desktop hero section images/petsCare.webp',
        titleColor: '#111111',
        btnBg: '#111111',
        btnTextColor: '#ffffff',
    },
    {
        id: '',
        title: { en: 'And More', fr: 'Et Plus', ar: 'والمزيد' },
        desc: {
            en: 'Cleaning, plumbing, cooking, moving and more — one app, every service you need.',
            fr: 'Nettoyage, plomberie, cuisine, déménagement — une appli, tous vos services.',
            ar: 'تنظيف، سباكة، طبخ، نقل والمزيد — تطبيق واحد، لكل خدمة تحتاجها.'
        },
        img: '/Images/Desktop hero section images/andMore.webp',
        titleColor: '#ffffff',
        btnBg: '#ffffff',
        btnTextColor: '#111111',
    }
];

const CARD_W = 44; // vw per card
const GAP = 1.2;   // vw gap between cards
const PAD = 1.5;   // vw padding each side

interface Props {
    onOrderClick: (id: string) => void;
    onBecomeBricolerClick?: () => void;
}

export const DesktopHeroScroll = ({ onOrderClick, onBecomeBricolerClick }: Props) => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const { language, setLanguage } = useLanguage();
    const lang = language;

    const totalSlideVw = SLIDES.length * CARD_W + (SLIDES.length - 1) * GAP + PAD * 2;
    const scrollVw = totalSlideVw - 100;

    const { scrollYProgress } = useScroll({ target: sectionRef });
    const x = useTransform(scrollYProgress, [0, 1], ['0vw', lang === 'ar' ? `${scrollVw}vw` : `-${scrollVw}vw`]);

    // ── Entrance animation variants ──────────────────────────────────────────
    const headerVariants = {
        hidden: { opacity: 0, y: -18 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }
        }
    };

    const stripVariants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 48, scale: 0.97 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const }
        }
    };


    return (
        <section
            ref={sectionRef}
            className="relative hidden md:block bg-white"
            style={{ height: `${SLIDES.length * 100}vh` }}
        >

            <div
                className="sticky top-0 bg-white overflow-hidden"
                style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* ── Header ── */}
                <motion.div
                    variants={headerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 32px',
                        flexShrink: 0,
                        backgroundColor: '#ffffff',
                    }}
                >
                    {/* Logo */}
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <img src="/Images/Logo/theEggOfLB.webp" alt="Lbricol" style={{ height: '30px', width: 'auto' }} />
                        <span style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: '#111111',
                            letterSpacing: '-0.03em',
                            fontFamily: 'var(--font-sans-one), var(--font-sans)',
                        }}>
                            Lbricol
                        </span>
                    </div>

                    {/* Right actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Language toggle EN / FR */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#f3f3f3',
                            borderRadius: '100px',
                            padding: '3px',
                            gap: '2px',
                        }}>
                            {(['en', 'fr', 'ar'] as const).map(l => (
                                <button
                                    key={l}
                                    onClick={() => setLanguage(l)}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: '100px',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: lang === l ? '#111111' : 'transparent',
                                        color: lang === l ? '#ffffff' : '#666666',
                                        letterSpacing: '0.02em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {l === 'ar' ? 'العربية' : l}
                                </button>
                            ))}
                        </div>

                        {/* Actions Container */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            {/* Become a Bricoler button */}
                            {onBecomeBricolerClick && (
                                <button
                                    onClick={onBecomeBricolerClick}
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: '#111111',
                                        border: '2px solid #e5e5e5',
                                        borderRadius: '100px',
                                        padding: '10px 24px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.borderColor = '#111111';
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.borderColor = '#e5e5e5';
                                    }}
                                >
                                    {lang === 'ar' ? 'كن حرفياً' : lang === 'fr' ? 'Devenir un Bricoleur' : 'Become a Bricoler'}
                                </button>
                            )}

                            {/* Download CTA */}
                            <button
                                onClick={() => onOrderClick('')}
                                style={{
                                    backgroundColor: '#31735a',
                                    color: '#ffffff',
                                    border: '2px solid #31735a',
                                    borderRadius: '100px',
                                    padding: '10px 24px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s ease',
                                }}
                                onMouseOver={e => (e.currentTarget.style.opacity = '0.82')}
                                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                            >
                                {lang === 'ar' ? 'تحميل التطبيق' : lang === 'fr' ? 'Télécharger l\'app' : 'Download the app'}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* ── Scrollable cards ── */}
                <div style={{ flex: 1, overflow: 'hidden', position: 'relative', paddingBottom: '24px' }}>
                    <motion.div
                        variants={stripVariants}
                        initial="hidden"
                        animate="visible"
                        style={{
                            x,
                            display: 'flex',
                            alignItems: 'stretch',
                            height: '100%',
                            gap: `${GAP}vw`,
                            paddingLeft: `${PAD}vw`,
                            paddingRight: `${PAD}vw`,
                        }}
                    >
                        {SLIDES.map((slide, idx) => (
                            <motion.div
                                key={idx}
                                variants={cardVariants}
                                style={{
                                    width: `${CARD_W}vw`,
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                }}
                            >
                                {/* Image with title overlay */}
                                <div style={{
                                    flex: 1,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    borderRadius: '20px',
                                    minHeight: 0,
                                }}>
                                    <img
                                        src={slide.img}
                                        alt={slide.title.en}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            objectPosition: 'center',
                                            display: 'block',
                                        }}
                                    />
                                    {/* Title inside image — bottom left */}
                                    <div style={{ position: 'absolute', bottom: '20px', left: '24px' }}>
                                        <h2 style={{
                                            fontFamily: 'var(--font-sans-one), var(--font-sans)',
                                            fontWeight: 700,
                                            fontSize: 'clamp(32px, 4.5vw, 64px)',
                                            lineHeight: 1,
                                            letterSpacing: '-0.01em',
                                            color: slide.titleColor,
                                            margin: 0,
                                        }}>
                                            {slide.title[lang] || slide.title.en}
                                        </h2>
                                    </div>
                                </div>

                                {/* Below image: desc + Order button */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    paddingTop: '14px',
                                    paddingBottom: '4px',
                                    flexShrink: 0,
                                }}>
                                    <p style={{
                                        color: '#444444',
                                        fontSize: 'clamp(11px, 1vw, 15px)',
                                        fontWeight: 400,
                                        lineHeight: 1.5,
                                        margin: 0,
                                        maxWidth: '58%',
                                    }}>
                                        {slide.desc[lang] || slide.desc.en}
                                    </p>

                                    <button
                                        onClick={() => onOrderClick(slide.id)}
                                        style={{
                                            backgroundColor: slide.btnBg,
                                            color: slide.btnTextColor,
                                            border: 'none',
                                            borderRadius: '100px',
                                            padding: '11px 32px',
                                            fontSize: 'clamp(13px, 1.1vw, 16px)',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                            transition: 'opacity 0.2s ease',
                                        }}
                                        onMouseOver={e => (e.currentTarget.style.opacity = '0.82')}
                                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                                    >
                                        {lang === 'ar' ? 'اطلب الآن' : lang === 'fr' ? 'Commander' : 'Order'}
                                    </button>
                                </div>
                            </motion.div>
                        ))}

                    </motion.div>
                </div>
            </div>
        </section>
    );
};
