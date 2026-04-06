"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';

// ─── City definitions: position in SVG space (viewBox 0 0 340 500) ───────────
// Computed from lat/lng → x=(lng+17.1)*21.12, y=(35.9-lat)*33.11
const KNOWN_CITIES: Record<string, { x: number; y: number; label: string; labelDir: 'left' | 'right' | 'top' | 'bottom' }> = {
    'casablanca': { x: 200, y: 77, label: 'Casablanca', labelDir: 'bottom' },
    'rabat': { x: 217, y: 62, label: 'Rabat', labelDir: 'left' },
    'marrakech': { x: 192, y: 141, label: 'Marrakech', labelDir: 'right' },
    'essaouira': { x: 155, y: 145, label: 'Essaouira', labelDir: 'left' },
    'agadir': { x: 158, y: 182, label: 'Agadir', labelDir: 'left' },
    'fes': { x: 256, y: 62, label: 'Fès', labelDir: 'right' },
    'fez': { x: 256, y: 62, label: 'Fès', labelDir: 'right' },
    'meknes': { x: 240, y: 55, label: 'Meknès', labelDir: 'top' },
    'tangier': { x: 239, y: 12, label: 'Tanger', labelDir: 'left' },
    'tanger': { x: 239, y: 12, label: 'Tanger', labelDir: 'left' },
    'oujda': { x: 313, y: 40, label: 'Oujda', labelDir: 'right' },
    'kenitra': { x: 222, y: 45, label: 'Kénitra', labelDir: 'top' },
    'dakhla': { x: 25, y: 405, label: 'Dakhla', labelDir: 'left' },
    'tetouan': { x: 255, y: 11, label: 'Tétouan', labelDir: 'right' },
};


function normalize(city: string): string {
    return city.toLowerCase()
        .replace(/é/g, 'e').replace(/è/g, 'e').replace(/ê/g, 'e')
        .replace(/â/g, 'a').replace(/à/g, 'a')
        .replace(/î/g, 'i').replace(/ô/g, 'o').replace(/û/g, 'u')
        .replace(/[-_]/g, ' ')
        .trim();
}

function matchCity(rawCity: string): string | null {
    const n = normalize(rawCity);
    for (const key of Object.keys(KNOWN_CITIES)) {
        if (normalize(key) === n || normalize(key).startsWith(n) || n.startsWith(normalize(key))) {
            return key;
        }
    }
    return null;
}

interface MoroccoServiceMapProps {
    className?: string;
}

export const MoroccoServiceMap: React.FC<MoroccoServiceMapProps> = ({ className }) => {
    const [activeCities, setActiveCities] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const { language } = useLanguage();
    const isFr = language === 'fr';

    useEffect(() => {
        const fetchCities = async () => {
            try {
                const snap = await getDocs(collection(db, 'bricolers'));
                const found = new Set<string>();
                snap.forEach(doc => {
                    const city: string = doc.data()?.city || '';
                    if (city) {
                        const key = matchCity(city);
                        if (key) found.add(key);
                    }
                });
                setActiveCities(found);
            } catch (e) {
                console.error('MoroccoServiceMap fetch error:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchCities();
    }, []);

    const activeCount = activeCities.size;

    const uniqueCities = Array.from(
        new Map(
            Object.entries(KNOWN_CITIES).map(([k, v]) => [v.label, { key: k, ...v }])
        ).values()
    );

    return (
        <section
            className={`hidden md:block ${className ?? ''}`}
            style={{ 
                padding: '160px 0 100px', 
                backgroundColor: '#E3F1EF',
                position: 'relative',
                overflow: 'hidden' 
            }}
            dir="ltr"
        >
            {/* Curved Top Border */}
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
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
                {/* Heading */}
                <div style={{ marginBottom: '60px' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-sans-one), var(--font-sans)',
                        fontWeight: 800,
                        fontSize: 'clamp(32px, 4vw, 56px)',
                        color: '#111111',
                        margin: 0,
                        lineHeight: 1.1,
                        letterSpacing: '-0.02em',
                    }}>
                        {language === 'ar'
                            ? `نعمل في ${activeCount} مدين${activeCount === 1 ? 'ة' : 'ة'} في المغرب`
                            : isFr
                                ? `Nous opérons dans ${activeCount} ville${activeCount !== 1 ? 's' : ''} au Maroc`
                                : `Operating in ${activeCount} ${activeCount !== 1 ? 'cities' : 'city'} across Morocco`}
                    </h2>
                </div>



                {/* Marquee Container */}
                <div style={{ position: 'relative', overflow: 'hidden', padding: '20px 0' }}>
                    {/* Left & Right fade masks */}
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, width: '150px',
                        background: 'linear-gradient(to right, #E3F1EF, transparent)', zIndex: 10, pointerEvents: 'none'
                    }} />
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0, right: 0, width: '150px',
                        background: 'linear-gradient(to left, #E3F1EF, transparent)', zIndex: 10, pointerEvents: 'none'
                    }} />

                    {/* Scrolling Track */}
                    <div className="city-marquee-track">
                        {[1, 2, 3].map((setIndex) => (
                            <div key={setIndex} style={{ display: 'flex', gap: '48px', alignItems: 'center', paddingRight: '48px' }}>
                                {uniqueCities.map((city) => {
                                    const isActive = Object.entries(KNOWN_CITIES).some(([k, v]) => v.label === city.label && activeCities.has(k));
                                    return (
                                        <div
                                            key={city.key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.4s ease'
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '32px',
                                                fontWeight: 800,
                                                fontFamily: 'var(--font-sans-one), var(--font-sans)',
                                                color: '#111',
                                                opacity: isActive ? 1 : 0.2,
                                                letterSpacing: '-0.02em'
                                            }}>
                                                {city.label}
                                            </span>
                                            {isActive && (
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#01A083',
                                                    boxShadow: '0 0 12px #01A083'
                                                }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {loading && (
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            border: '3px solid #31735a', borderTopColor: 'transparent',
                            animation: 'spin 0.9s linear infinite'
                        }} />
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes marqueeScroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .city-marquee-track {
                    display: flex;
                    width: max-content;
                    animation: marqueeScroll 25s linear infinite;
                }
                .city-marquee-track:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </section>
    );
};
