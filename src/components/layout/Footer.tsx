"use client";

import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Globe, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';

const Footer = () => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isMobile = useIsMobileViewport(968);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F5F5F5' : '#111111'
    };

    const footerSections = [
        {
            title: t({ en: 'Company', fr: 'Entreprise', ar: 'الشركة' }),
            links: [
                { name: t({ en: 'About us', fr: 'À propos', ar: 'من نحن' }), href: '#' },
                { name: t({ en: 'Our offerings', fr: 'Nos services', ar: 'خدماتنا' }), href: '#' },
                { name: t({ en: 'Newsroom', fr: 'Salle de presse', ar: 'غرفة الأخبار' }), href: '#' },
                { name: t({ en: 'Blog', fr: 'Blog', ar: 'المدونة' }), href: '#' }
            ]
        },
        {
            title: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }),
            links: [
                { name: t({ en: 'Domestic Help', fr: 'Aide Ménagère', ar: 'مساعدة منزلية' }), href: '#' },
                { name: t({ en: 'Go Delivery', fr: 'Livraison Go', ar: 'توصيل جو' }), href: '#' },
                { name: t({ en: 'Cleaning', fr: 'Nettoyage', ar: 'تنظيف' }), href: '#' },
                { name: t({ en: 'Handyman', fr: 'Bricolage', ar: 'بستنة' }), href: '#' }
            ]
        },
        {
            title: t({ en: 'Partners', fr: 'Partenaires', ar: 'الشركاء' }),
            links: [
                { name: t({ en: 'Become a Lbricolager', fr: 'Devenir un Bricoleur', ar: 'كن حرفياً' }), href: '#' },
                { name: t({ en: 'Fleet owners', fr: 'Propriétaires de flotte', ar: 'أصحاب الأساطيل' }), href: '#' },
                { name: t({ en: 'Business partners', fr: 'Partenaires commerciaux', ar: 'شركاء الأعمال' }), href: '#' }
            ]
        },
        {
            title: t({ en: 'Support', fr: 'Support', ar: 'الدعم' }),
            links: [
                { name: t({ en: 'Help Center', fr: "Centre d'aide", ar: 'مركز المساعدة' }), href: '#' },
                { name: t({ en: 'Safety', fr: 'Sécurité', ar: 'الأمان' }), href: '#' },
                { name: t({ en: 'Terms of service', fr: "Conditions d'utilisation", ar: 'شروط الخدمة' }), href: '#' },
                { name: t({ en: 'Privacy policy', fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية' }), href: '/privacy' }
            ]
        }
    ];

    return (
        <footer style={{
            backgroundColor: (theme === 'light' ? '#FAFAFA' : '#000000'),
            color: c.text,
            padding: isMobile ? '4rem 1.5rem' : '6rem 0',
            overflow: 'hidden',
            borderTop: (theme === 'light' ? `1px solid ${c.border}` : 'none'),
            transition: 'background-color 0.3s ease'
        }}>
            <div style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: isMobile ? '0' : '0 2rem'
            }}>
                <div style={{ marginBottom: isMobile ? '3rem' : '5rem' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.05em', color: c.text }}>Lbricol</span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: isMobile ? '2.5rem' : '4rem',
                    marginBottom: '4rem'
                }}>
                    {footerSections.map((section, idx) => (
                        <div key={idx}>
                            <h4 style={{ fontSize: '15px', fontWeight: 900, marginBottom: '1.5rem', color: c.text }}>
                                {section.title}
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                {section.links.map((link, linkIdx) => (
                                    <li key={linkIdx}>
                                        <a href={link.href} style={{
                                            color: c.textMuted,
                                            textDecoration: 'none',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            transition: 'color 0.2s ease'
                                        }}>
                                            {link.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div style={{
                    paddingTop: '3rem',
                    borderTop: `1px solid ${c.border}`,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    gap: '2.5rem'
                }}>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: c.text }}>
                            <Globe size={16} />
                            <span>{language === 'ar' ? 'العربية' : language === 'en' ? 'English' : 'Français'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: c.text }}>
                            <MapPin size={16} />
                            <span>{t({ en: 'Morocco', fr: 'Maroc', ar: 'المغرب' })}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <Facebook size={20} style={{ color: c.text, cursor: 'pointer', transition: 'opacity 0.2s' }} />
                        <Twitter size={20} style={{ color: c.text, cursor: 'pointer', transition: 'opacity 0.2s' }} />
                        <Instagram size={20} style={{ color: c.text, cursor: 'pointer', transition: 'opacity 0.2s' }} />
                        <Linkedin size={20} style={{ color: c.text, cursor: 'pointer', transition: 'opacity 0.2s' }} />
                    </div>
                </div>

                <div style={{
                    marginTop: '3rem',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    fontSize: '12px',
                    color: c.textMuted,
                    fontWeight: 500
                }}>
                    <p>© 2026 Lbricol. {t({ en: 'All rights reserved.', fr: 'Tous droits réservés.', ar: 'جميع الحقوق محفوظة.' })}</p>
                    <p>{t({ en: 'Proudly built in Marrakesh. 🇲🇦', fr: 'Fièrement construit à Marrakech. 🇲🇦', ar: 'صُنع بكل فخر في مراكش. 🇲🇦' })}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
