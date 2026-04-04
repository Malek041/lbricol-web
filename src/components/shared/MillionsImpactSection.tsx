"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';

const MillionsImpactSection = () => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isMobile = useIsMobileViewport(968);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F5F5F5' : '#111111',
        card: theme === 'light' ? '#FFFFFF' : '#1A1A1A'
    };

    const bubbleData = [
        // Top Left
        { x: '-35vw', y: '-25vh', delay: 0.2, content: t({ en: "Looking for a plumber", fr: "Je cherche un plombier", ar: "أبحث عن سباك" }), avatar: "/Images/Service Category vectors/HandymanVector.webp" },
        { x: '-42vw', y: '-12vh', delay: 0.5, avatar: "/Images/Service Category vectors/CleaningVector.webp" },
        // Top Right
        { x: '35vw', y: '-28vh', content: t({ en: "Thank you so much!", fr: "Merci beaucoup !", ar: "شكرا جزيلا!" }), delay: 0.3, avatar: "/Images/Vectors Illu/CarWithDriver.png" },
        { x: '42vw', y: '-15vh', delay: 0.6, avatar: "/Images/Vectors Illu/babysetting.webp" },
        // Bottom Left
        { x: '-38vw', y: '10vh', content: t({ en: "Arrived safely", fr: "Arrivé en toute sécurité", ar: "وصلت بأمان" }), delay: 0.4, avatar: "/Images/Vectors Illu/Groceriedbag.png" },
        { x: '-28vw', y: '15vh', delay: 0.7, avatar: "/Images/Service Category vectors/MovingHelpVector.webp" },
        // Bottom Right
        { x: '38vw', y: '8vh', content: t({ en: "Great pricing!", fr: "Excellent prix !", ar: "أسعار ممتازة!" }), delay: 0.2, avatar: "/Images/Service Category vectors/AsssemblyVector.webp" },
        { x: '32vw', y: '18vh', delay: 0.8, avatar: "/Images/Vectors Illu/shoppingbag.webp" },
    ];

    return (
        <section style={{
            padding: isMobile ? '4rem 0' : '6rem 0',
            backgroundColor: c.bg,
            position: 'relative',
            minHeight: isMobile ? '600px' : '800px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'background-color 0.3s ease'
        }}>
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
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: [0.21, 1.11, 0.81, 0.99] }}
                    style={{ maxWidth: '900px', margin: '0 auto' }}
                >
                    <h2 style={{
                        fontSize: isMobile ? '32px' : '56px',
                        fontWeight: 900,
                        color: c.text,
                        lineHeight: '1.1',
                        letterSpacing: '-0.04em',
                        fontFamily: 'Uber Move, var(--font-sans)'
                    }}>
                        {t({
                            en: "Facilitating the lives of people in the city, Lbricol connects you to nearby expert help in 10 seconds.",
                            fr: "Facilitant la vie des citadins, Lbricol vous connecte à une aide experte et à une mobilité fluide.",
                            ar: "نسهل حياة سكان المدينة، ونوصلك بمساعدة الخبراء وتسهيل التنقل."
                        })}
                    </h2>
                </motion.div>
            </div>

            {/* Floating Elements Area */}
            <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 10,
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {bubbleData.map((bubble, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                            whileInView={{
                                opacity: 1,
                                scale: 1,
                                x: isMobile ? `calc(${bubble.x} / 2)` : bubble.x,
                                y: isMobile ? `calc(${bubble.y} / 1.5)` : bubble.y
                            }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 80,
                                delay: bubble.delay,
                            }}
                            style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: '12px' }}
                        >
                            <motion.div
                                animate={{ y: [0, -15, 0] }}
                                transition={{
                                    duration: 4 + Math.random() * 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {bubble.content && index % 2 === 0 && (
                                    <div style={{
                                        backgroundColor: c.card,
                                        padding: '12px 20px',
                                        borderRadius: '16px',
                                        boxShadow: theme === 'light' ? '0 8px 30px rgba(0,0,0,0.08)' : '0 8px 30px rgba(0,0,0,0.4)',
                                        border: `1px solid ${c.border}`,
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: c.text,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {bubble.content}
                                    </div>
                                )}

                                <div style={{ position: 'relative' }}>
                                    <img
                                        src={bubble.avatar}
                                        alt="User"
                                        style={{
                                            width: isMobile ? '48px' : '64px',
                                            height: isMobile ? '48px' : '64px',
                                            borderRadius: '50%',
                                            border: `3px solid ${c.bg}`,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                            objectFit: 'cover'
                                        }}
                                    />
                                </div>

                                {bubble.content && index % 2 !== 0 && (
                                    <div style={{
                                        backgroundColor: c.card,
                                        padding: '12px 20px',
                                        borderRadius: '16px',
                                        boxShadow: theme === 'light' ? '0 8px 30px rgba(0,0,0,0.08)' : '0 8px 30px rgba(0,0,0,0.4)',
                                        border: `1px solid ${c.border}`,
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: c.text,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {bubble.content}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MillionsImpactSection;
