"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, ChevronDown, Search, User, LogIn } from 'lucide-react';

interface Props {
    onOrderClick: (id: string) => void;
    onBecomeBricolerClick?: () => void;
}

// ── Hero Categories (Matching Pic 1 style) ──────────────────────────────────
const CATEGORIES = [
    {
        id: 'home_repairs',
        label: { en: 'Handyman', fr: 'Bricolage', ar: 'إصلاحات' },
        icon: '/Images/Service Category vectors/HandymanVector.webp',
        bgColor: '#FFF9E5'
    },
    {
        id: 'cleaning',
        label: { en: 'Cleaning', fr: 'Nettoyage', ar: 'تنظيف' },
        icon: '/Images/Service Category vectors/CleaningVector.webp',
        bgColor: '#D1FAE5'
    },
    {
        id: 'errands',
        label: { en: 'Errands', fr: 'Courses', ar: 'قضاء أغراض' },
        icon: '/Images/Vectors Illu/shoppingbag.webp',
        bgColor: '#FEE2E2'
    },
    {
        id: 'childcare',
        label: { en: 'Nanny', fr: 'Garde', ar: 'جليسة أطفال' },
        icon: '/Images/Vectors Illu/babysetting.webp',
        bgColor: '#DBEAFE'
    },
    {
        id: 'delivery',
        label: { en: 'Delivery', fr: 'Livraison', ar: 'توصيل' },
        icon: '/Images/Vectors Illu/Groceriedbag.png',
        bgColor: '#CCF1FF'
    }
];

const SLIDES = [
    {
        id: 'errands',
        title: { en: 'Errands', fr: 'Courses', ar: 'قضاء الحاجات' },
        desc: {
            en: 'Need groceries or a quick drop-off? Order it done from your couch.',
            fr: 'Courses ou dépôt rapide ? Commandez depuis votre canapé.',
            ar: 'هل تحتاج إلى بقالة أو توصيل سريع؟ اطلب ذلك وأنت مرتاح في منزلك.'
        },
        img: '/Images/Desktop hero section images/Errands.webp',
        titleColor: '#31735a',
        btnBg: '#31735a',
    },
    {
        id: 'babysitting',
        title: { en: 'Babysitting', fr: 'Garde d\'enfants', ar: 'جليسة أطفال' },
        desc: {
            en: 'Find trusted, vetted babysitters available today. Book in minutes.',
            fr: 'Trouvez des baby-sitters de confiance disponibles aujourd\'hui.',
            ar: 'ابحث عن جليسات أطفال موثوقات متوفرات اليوم. احجز في دقائق.'
        },
        img: '/Images/Desktop hero section images/baybsetting.webp',
        titleColor: '#f24cb0',
        btnBg: '#f24cb0',
    },
    {
        id: 'gardening',
        title: { en: 'Gardening', fr: 'Jardinage', ar: 'بستنة' },
        desc: {
            en: 'Lawn mowing, planting, trimming — garden expert help.',
            fr: 'Tonte, plantation, taille — votre jardin transformé.',
            ar: 'قص العشب، الزراعة، التقليم — حديقتك تتحول على يد خبير.'
        },
        img: '/Images/Desktop hero section images/Gardening.webp',
        titleColor: '#76bbf8',
        btnBg: '#76bbf8',
    }
];

export const DesktopHeroScroll = ({ onOrderClick, onBecomeBricolerClick }: Props) => {
    const { language, setLanguage, t } = useLanguage();
    const [searchValue, setSearchValue] = useState('');
    const lang = language;

    // Header Address
    const currentAddress = lang === 'ar' ? 'زنقة الحوز' : 'Rue El Haouz';

    return (
        <div className="hidden md:block bg-white pb-20">
            {/* ── Hero Splash (Blue) ── */}
            <section className="relative bg-[#FFCC02] w-full overflow-hidden" style={{ height: '640px' }}>
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-40 px-12 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div
                            className="flex items-center gap-2 cursor-pointer select-none"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            <span style={{
                                fontSize: '48px',
                                fontWeight: 900,
                                color: '#01A083',
                                letterSpacing: '-3px',
                                fontFamily: 'var(--font-sans-one), var(--font-sans)',
                                display: 'flex',
                                alignItems: 'baseline'
                            }}>
                                Lbricol
                                <div className="w-2.5 h-2.5 rounded-full bg-[#01A083] ml-1 mb-1.5" />
                            </span>
                        </div>

                        <div className="bg-white rounded-full px-5 py-3 flex items-center gap-2.5 border-2 border-black/5 cursor-pointer hover:bg-neutral-50 transition-all duration-200">
                            <MapPin size={20} className="text-black" />
                            <span className="text-[17px] font-bold text-black border-r border-black/10 pr-4 mr-1">
                                {currentAddress}
                            </span>
                            <ChevronDown size={20} className="text-black/80" />
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center bg-black/10 rounded-full p-1.5 gap-1">
                            {(['fr', 'ar'] as const).map(l => (
                                <button
                                    key={l}
                                    onClick={() => setLanguage(l)}
                                    className={`px-5 py-2 rounded-full text-[14px] font-black uppercase transition-all ${
                                        lang === l ? 'bg-black text-white' : 'text-black hover:bg-black/5'
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onBecomeBricolerClick}
                            className="bg-[#00A082] hover:bg-[#008f73] text-white rounded-full px-8 py-3.5 flex items-center gap-2.5 font-black text-[17px] transition-all active:scale-95"
                        >
                            <User size={22} strokeWidth={3} />
                            Connexion
                        </button>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="flex flex-col items-center justify-center h-full pt-20">
                    <div className="flex items-center justify-center gap-12 mb-16">
                        {CATEGORIES.map((cat, i) => (
                            <motion.div
                                key={cat.id}
                                initial={{ opacity: 0, y: 40, scale: 0.85 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0.1 * i, duration: 0.6, type: 'spring' }}
                                className="flex flex-col items-center gap-5 group cursor-pointer"
                                onClick={() => onOrderClick(cat.id)}
                            >
                                {/* Eggy Shape Bubble - rounded-full is standard but we'll use organic borders */}
                                <div className="relative w-[130px] h-[130px] bg-white rounded-[60px_45px_70px_50px] flex items-center justify-center p-6 border-4 border-white/40 transition-all duration-500 transform group-hover:-translate-y-4 group-hover:scale-105">
                                    <img src={cat.icon} alt={cat.label.en} className="w-full h-full object-contain" />
                                </div>
                                
                                <div className="bg-white px-8 py-2 rounded-full border-2 border-black/5 text-[14px] font-black uppercase tracking-widest text-[#1D1D1D] group-hover:bg-[#1D1D1D] group-hover:text-white transition-all duration-400">
                                    {cat.label[lang as keyof typeof cat.label] || cat.label.en}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        className="w-full max-w-[820px] flex items-center gap-5 px-6 pr-1.5 bg-white rounded-full h-[76px] border-4 border-white/30 group transition-all"
                    >
                        <Search className="text-[#01A083] ml-2" size={28} strokeWidth={3} />
                        <input
                            type="text"
                            placeholder={t({ en: 'What do you need?', fr: 'De quoi avez-vous besoin ?', ar: 'ماذا تحتاج؟' })}
                            className="flex-1 bg-transparent border-none outline-none text-[22px] text-neutral-800 font-bold placeholder:text-neutral-400"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                        <button className="bg-[#00A082] hover:bg-[#008f73] text-white rounded-full px-12 h-[60px] font-black text-[19px] transition-all active:scale-95">
                            Recherche
                        </button>
                    </motion.div>
                </div>

                {/* Wave Bottom */}
                <div className="absolute bottom-[-1px] left-0 right-0 h-[80px] z-10 pointer-events-none">
                    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full fill-white">
                        <path d="M0,64L80,74.7C160,85,320,107,480,101.3C640,96,800,64,960,53.3C1120,43,1280,53,1360,58.7L1440,64V120H1360C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120H0V64Z"></path>
                    </svg>
                </div>
            </section>

            {/* ── Scrollable Big Cards Section (Below Hero) ── */}
            <div className="mt-20 px-12 overflow-x-auto no-scrollbar">
                <div className="flex gap-8 pb-10 min-w-max">
                    {SLIDES.map((slide) => (
                        <div key={slide.id} className="w-[480px] flex flex-col group cursor-pointer" onClick={() => onOrderClick(slide.id)}>
                            {/* Card Image Wrapper with Eggy corners */}
                            <div className="relative aspect-[16/10] overflow-hidden rounded-[40px_60px_40px_80px] border-4 border-neutral-50 transition-all duration-500 group-hover:-translate-y-2">
                                <img src={slide.img} alt={slide.title.en} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <h2 className="absolute bottom-6 left-8 font-black text-[56px] leading-none" style={{ color: slide.titleColor }}>
                                    {slide.title[lang as keyof typeof slide.title] || slide.title.en}
                                </h2>
                            </div>
                            
                            {/* Card Details Area */}
                            <div className="mt-6 flex items-center justify-between px-2">
                                <p className="text-[16px] text-neutral-500 font-bold max-w-[280px] leading-tight">
                                    {slide.desc[lang as keyof typeof slide.desc] || slide.desc.en}
                                </p>
                                <button className="px-8 py-3 rounded-full text-white font-black text-[15px] transition-all" style={{ backgroundColor: slide.btnBg }}>
                                    Commander
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


