"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';

const OpportunitySection = () => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isMobile = useIsMobileViewport(968);

    const c = {
        bg: '#E3F1EF',
        text: '#000000',
        textMuted: '#4A4A4A',
        accent: '#01A083', // Glovo-like green accent
        accentLight: 'rgba(1, 160, 131, 0.1)'
    };

    const opportunities = [
        {
            title: t({ en: "Be your own boss", fr: "Soyez votre propre patron", ar: "كن رئيس نفسك" }),
            desc: t({
                en: "Manage your schedule and work whenever you want. You are in full control.",
                fr: "Gérez votre emploi du temps et travaillez quand vous voulez. Vous êtes le seul maître.",
                ar: "أدر جدولك الزمني واعمل وقتما تشاء. أنت المسؤول بالكامل."
            }),
            img: "/Users/xProject/.gemini/antigravity/brain/9d27a721-944b-4e8c-9f5a-8e84c67c10e0/bricoler_opportunity_1_1775504636713.png",
            eggColor: "#B6DED8"
        },
        {
            title: t({ en: "Earn competitive income", fr: "Gagnez plus", ar: "اربح المزيد" }),
            desc: t({
                en: "Get paid competitively for every task you complete. Fast and reliable payouts.",
                fr: "Des revenus compétitifs versés pour chaque mission accomplie. Paiements rapides.",
                ar: "احصل على أجر تنافسي مقابل كل مهمة تكملها. دفعات سريعة وموثوقة."
            }),
            img: "/Users/xProject/.gemini/antigravity/brain/9d27a721-944b-4e8c-9f5a-8e84c67c10e0/bricoler_opportunity_2_1775504673345.png",
            eggColor: "#A3D1C9"
        },
        {
            title: t({ en: "Reach thousands", fr: "Visibilité maximale", ar: "وصول غير محدود" }),
            desc: t({
                en: "Join Morocco's #1 platform and get instant access to thousands of clients daily.",
                fr: "Rejoignez la plateforme n°1 au Maroc et accédez à des milliers de clients chaque jour.",
                ar: "انضم إلى المنصة رقم 1 في المغرب واحصل على وصول فوري لآلاف العملاء يوميًا."
            }),
            img: "/Users/xProject/.gemini/antigravity/brain/9d27a721-944b-4e8c-9f5a-8e84c67c10e0/bricoler_opportunity_3_1775504730345.png",
            eggColor: "#8FC4BB"
        }
    ];

    return (
        <section style={{
            padding: isMobile ? '80px 0' : '160px 0 100px',
            backgroundColor: c.bg,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            {/* Curved Top Border (matching the one I added to MoroccoServiceMap) */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100px',
                overflow: 'hidden',
                lineHeight: 0
            }}>
                <svg
                    viewBox="0 0 1440 120"
                    preserveAspectRatio="none"
                    style={{
                        position: 'relative',
                        display: 'block',
                        width: 'calc(100% + 1.3px)',
                        height: '100px',
                        transform: 'rotate(180deg)'
                    }}
                >
                    <path
                        d="M0,0 C480,100 960,100 1440,0 L1440,120 L0,120 Z"
                        fill="#FFFFFF"
                    />
                </svg>
            </div>

            <div style={{
                width: '100%',
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '0 1.5rem',
                position: 'relative',
                zIndex: 20,
                textAlign: 'center'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    style={{ marginBottom: '80px' }}
                >
                     {/* Handshake Icon Placeholder */}
                     <div style={{ 
                        margin: '0 auto 24px', 
                        fontSize: '3rem',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        🤝
                    </div>

                    <h2 style={{
                        fontSize: isMobile ? '36px' : '56px',
                        fontWeight: 950,
                        color: c.text,
                        lineHeight: '1.1',
                        letterSpacing: '-0.04em',
                        fontFamily: 'Uber Move, var(--font-sans)',
                        marginBottom: '1rem'
                    }}>
                        {t({ en: "Opportunities", fr: "Opportunités", ar: "فرص العمل" })}
                    </h2>
                </motion.div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
                    gap: isMobile ? '60px' : '40px',
                    width: '100%'
                }}>
                    {opportunities.map((opt, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: idx * 0.1 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '24px'
                            }}
                        >
                            {/* Eggy Image Container */}
                            <div style={{ position: 'relative', width: '240px', height: '240px' }}>
                                {/* The "Egg" Background */}
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '-15px',
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: opt.eggColor,
                                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                                    transform: `rotate(${idx % 2 === 0 ? '-5deg' : '5deg'})`,
                                    zIndex: 1
                                }} />
                                {/* The Image */}
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                                    overflow: 'hidden',
                                    zIndex: 2,
                                    border: '4px solid white',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                                }}>
                                    <img
                                        src={opt.img}
                                        alt={opt.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                                <h3 style={{
                                    fontSize: '24px',
                                    fontWeight: 900,
                                    marginBottom: '12px',
                                    color: c.text,
                                    fontFamily: 'Uber Move, var(--font-sans)',
                                    letterSpacing: '-0.02em'
                                }}>
                                    {opt.title}
                                </h3>
                                <p style={{
                                    fontSize: '16px',
                                    lineHeight: '1.6',
                                    color: c.textMuted,
                                    fontWeight: 500,
                                    marginBottom: '24px'
                                }}>
                                    {opt.desc}
                                </p>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        backgroundColor: c.accent,
                                        color: 'white',
                                        padding: '12px 32px',
                                        borderRadius: '100px',
                                        border: 'none',
                                        fontWeight: 900,
                                        fontSize: '15px',
                                        cursor: 'pointer',
                                        boxShadow: '0 8px 20px rgba(1, 160, 131, 0.2)'
                                    }}
                                >
                                    {t({ en: "Sign up", fr: "Inscription", ar: "سجل الآن" })}
                                </motion.button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default OpportunitySection;
