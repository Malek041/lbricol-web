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

    const heroImages = [
        '/Images/clientHomeHeroSection/Cleaning.png',
        '/Images/clientHomeHeroSection/groceries.png',
        '/Images/clientHomeHeroSection/money.png',
        '/Images/clientHomeHeroSection/movingHelp.png',
        '/Images/clientHomeHeroSection/onlineStore.png',
        '/Images/clientHomeHeroSection/petsCare.png',
    ];

    // Multiply images for a smooth infinite scroll loop
    const marqueeImages = [...heroImages, ...heroImages, ...heroImages, ...heroImages];

    return (
        <section style={{
            padding: isMobile ? '4rem 0' : '8rem 0 4rem 0',
            backgroundColor: c.bg,
            position: 'relative',
            minHeight: isMobile ? '500px' : '650px',
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
                        fontFamily: 'Uber Move, var(--font-sans)',
                        marginBottom: '60px'
                    }}>
                        {t({
                            en: "Lbricol connects you to nearby expert help in 10 seconds.",
                            fr: "Facilitant la vie des citadins, Lbricol vous connecte à une aide experte et à une mobilité fluide.",
                            ar: "نسهل حياة سكان المدينة، ونوصلك بمساعدة الخبراء وتسهيل التنقل."
                        })}
                    </h2>

                    {/* Infinite Marquee of Icons */}
                    <div style={{
                        width: '100%',
                        overflow: 'hidden',
                        position: 'relative',
                        padding: '40px 0',
                        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
                    }}>
                        <motion.div
                            animate={{
                                x: [0, -heroImages.length * 200]
                            }}
                            transition={{
                                x: {
                                    duration: 30,
                                    repeat: Infinity,
                                    ease: "linear"
                                }
                            }}
                            style={{
                                display: 'flex',
                                width: 'fit-content',
                                gap: isMobile ? '60px' : '100px',
                                alignItems: 'center'
                            }}
                        >
                            {marqueeImages.map((img, idx) => (
                                <div key={idx} style={{ 
                                    flexShrink: 0,
                                    padding: '10px'
                                }}>
                                    <img 
                                        src={img} 
                                        alt="" 
                                        style={{ 
                                            height: isMobile ? '80px' : '150px', 
                                            width: 'auto',
                                            objectFit: 'contain',
                                            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.05))'
                                        }} 
                                    />
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default MillionsImpactSection;
