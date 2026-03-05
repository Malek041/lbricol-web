"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const REVIEWS = [
    {
        id: 1,
        name: 'Fatima Zahra',
        city: 'Casablanca',
        service: 'Cleaning',
        serviceFr: 'Ménage',
        rating: 5,
        comment: 'Service impeccable ! La dame était très ponctuelle et professionnelle. Ma maison brille.',
        commentEn: 'Impeccable service! The lady was very punctual and professional. My house is shining.'
    },
    {
        id: 2,
        name: 'Mehdi Alami',
        city: 'Rabat',
        service: 'Plumbing',
        serviceFr: 'Plomberie',
        rating: 5,
        comment: 'Réparation rapide d\'une fuite complexe. Très satisfait de la réactivité.',
        commentEn: 'Quick repair of a complex leak. Very satisfied with the reactivity.'
    },
    {
        id: 3,
        name: 'Sofia Benani',
        city: 'Marrakech',
        service: 'Babysitting',
        serviceFr: 'Garde d\'enfants',
        rating: 5,
        comment: 'Mes enfants ont adoré passer du temps avec elle. Je recommande vivement pour sa patience.',
        commentEn: 'My children loved spending time with her. I highly recommend her for her patience.'
    },
    {
        id: 4,
        name: 'Youssef El Fassi',
        city: 'Tangier',
        service: 'Electricity',
        serviceFr: 'Électricité',
        rating: 4.8,
        comment: 'Installation de luminaires faite proprement. Travail soigné et prix honnête.',
        commentEn: 'Lighting installation done correctly. Neat work and honest price.'
    },
    {
        id: 5,
        name: 'Salma Mansouri',
        city: 'Agadir',
        service: 'Gardening',
        serviceFr: 'Jardinage',
        rating: 5,
        comment: 'Mon jardin est transformé ! Un vrai pro qui connaît son métier.',
        commentEn: 'My garden is transformed! A true pro who knows his trade.'
    }
];

export const ReviewsScrollingSection = () => {
    const { t } = useLanguage();

    // Duplicate reviews for seamless looping
    const duplicatedReviews = [...REVIEWS, ...REVIEWS];

    return (
        <div className="w-full overflow-hidden py-10 bg-neutral-50/30">
            <div className="px-6 mb-6">
                <h3 className="text-[20px] font-black text-neutral-900 flex items-center gap-2">
                    <Star size={20} className="text-[#FFC244] fill-[#FFC244]" />
                    {t({ en: 'What our clients say', fr: 'Ce que disent nos clients' })}
                </h3>
                <p className="text-[14px] font-medium text-neutral-400 mt-0.5">
                    {t({ en: 'Real feedback from real people', fr: 'Des retours réels de vraies personnes' })}
                </p>
            </div>

            <div className="flex relative">
                <motion.div
                    className="flex gap-4 px-4"
                    animate={{
                        x: [0, -1400], // Adjust based on content width
                    }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 35,
                            ease: "linear",
                        },
                    }}
                >
                    {duplicatedReviews.map((review, idx) => (
                        <div
                            key={`${review.id}-${idx}`}
                            className="flex-shrink-0 w-[280px] p-6 bg-white/70 backdrop-blur-md rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/40 flex flex-col gap-3"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-black text-neutral-900">{review.name}</span>
                                    <span className="text-[12px] font-bold text-neutral-400">{review.city}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-[#FFF8E7] px-2 py-1 rounded-full">
                                    <Star size={10} className="text-[#FFC244] fill-[#FFC244]" />
                                    <span className="text-[12px] font-black text-neutral-900">{review.rating}</span>
                                </div>
                            </div>

                            <div className="relative">
                                <Quote size={16} className="text-[#00A082] opacity-20 absolute -top-1 -left-1" />
                                <p className="text-[14px] text-neutral-600 font-medium leading-relaxed indent-4 line-clamp-3">
                                    {t({ en: review.commentEn, fr: review.comment })}
                                </p>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-neutral-50 text-[11px] font-bold text-[#00A082] rounded-lg uppercase tracking-wider border border-neutral-100">
                                    {t({ en: review.service, fr: review.serviceFr })}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
