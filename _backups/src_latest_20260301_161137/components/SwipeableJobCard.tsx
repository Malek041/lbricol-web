"use client";

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, MapPin, Clock, Banknote, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Job } from '@/app/provider/page';
import { useLanguage } from '@/context/LanguageContext';

interface SwipeableJobCardProps {
    job: Job;
    onSwipeRight: () => void; // Accept
    onSwipeLeft: () => void; // Decline/Skip
    onClick?: () => void; // View Details
    style?: React.CSSProperties;
    index: number; // Z-index control
}

// Helper to get a relevant image background based on service
const getServiceImage = (service: string): string => {
    const serviceLower = service.toLowerCase();

    // High contrast, expressive images from Unsplash
    if (serviceLower.includes('cleaning')) return 'https://images.unsplash.com/photo-1581578731117-104f2a41272c?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('plumbing')) return 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('electr')) return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('paint')) return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('garden')) return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('mov')) return 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('baby')) return 'https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1000&auto=format&fit=crop';
    if (serviceLower.includes('driver') || serviceLower.includes('car')) return 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop';

    // Default fallback (Tools/Work)
    return 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1000&auto=format&fit=crop';
};

const SwipeableJobCard: React.FC<SwipeableJobCardProps> = ({ job, onSwipeRight, onSwipeLeft, onClick, style, index }) => {
    const { t } = useLanguage();
    const x = useMotionValue(0);
    const y = useMotionValue(0); // Slight vertical movement for natural feel
    const rotate = useTransform(x, [-200, 200], [-15, 15]); // Rotate based on swipe
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]); // Fade out at extremes

    // Stamp Opacity
    const acceptOpacity = useTransform(x, [50, 150], [0, 1]);
    const rejectOpacity = useTransform(x, [-150, -50], [1, 0]);

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (info.offset.x > 100) {
            onSwipeRight();
        } else if (info.offset.x < -100) {
            onSwipeLeft();
        } else {
            // Reset position if swipe wasn't strong enough
            x.set(0);
            y.set(0);
        }
    };

    const bgImage = getServiceImage(job.title || job.craft);

    return (
        <motion.div
            style={{
                x,
                y,
                rotate,
                opacity,
                zIndex: index,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '100%',
                cursor: 'grab',
                ...style
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: 'grabbing', scale: 1.02 }}
            className="w-full h-full p-4"
        >
            <div
                className="relative w-full h-full rounded-[30px] overflow-hidden shadow-2xl bg-black border border-white/10"
                onClick={onClick}
            >
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src={bgImage}
                        alt={job.title}
                        className="w-full h-full object-cover opacity-80"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
                </div>

                {/* Status Stamps (Like Tinder's LIKE / NOPE) */}
                <motion.div
                    style={{ opacity: acceptOpacity }}
                    className="absolute top-10 left-10 border-4 border-green-500 rounded-xl px-4 py-2 rotate-[-15deg] z-20"
                >
                    <span className="text-3xl font-black text-green-500 uppercase tracking-widest">{t({ en: 'ACCEPT', fr: 'ACCEPTER' })}</span>
                </motion.div>

                <motion.div
                    style={{ opacity: rejectOpacity }}
                    className="absolute top-10 right-10 border-4 border-red-500 rounded-xl px-4 py-2 rotate-[15deg] z-20"
                >
                    <span className="text-3xl font-black text-red-500 uppercase tracking-widest">{t({ en: 'NOPE', fr: 'NON' })}</span>
                </motion.div>

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-24 bg-gradient-to-t from-black via-black/80 to-transparent">
                    {/* Urgency / Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(job as any).status === 'urgent' && ( // Assuming status or urgent flag exists, otherwise mockup
                            <div className="px-3 py-1 bg-yellow-500/20 backdrop-blur-md border border-yellow-500/50 rounded-full flex items-center gap-1.5">
                                <ShieldAlert size={12} className="text-yellow-500" />
                                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{t({ en: 'Urgent', fr: 'Urgent' })}</span>
                            </div>
                        )}
                        <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-1.5">
                            <MapPin size={12} className="text-white" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{(job as any).distance || '2.5 km'}</span>
                        </div>
                    </div>

                    <div className="flex items-end justify-between mb-4">
                        <div>
                            <h2 className="text-4xl font-black text-white leading-tight shadow-sm">
                                {job.title}
                            </h2>
                            <p className="text-lg font-medium text-neutral-300 mt-2 line-clamp-2">
                                {(job as any).description || t({ en: 'No description provided.', fr: 'Aucune description fournie.' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500 rounded-full">
                            <Banknote size={16} className="text-white" />
                            <span className="text-lg font-black text-white">{job.price} MAD</span>
                        </div>
                        {/* Time Badge mockup */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800 rounded-full">
                            <Clock size={16} className="text-neutral-400" />
                            <span className="text-sm font-bold text-white">{t({ en: 'Today 14:00', fr: 'Aujourd’hui 14:00' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Buttons (Outside the card content proper but visually connected) */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6 z-30">
                <button
                    onClick={(e) => { e.stopPropagation(); onSwipeLeft(); }}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
                >
                    <X size={32} className="text-red-500" strokeWidth={3} />
                </button>

                {/* Job Details / Super Like equivalent */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
                    className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
                >
                    <div className="w-1.5 h-1.5 bg-white rounded-full mb-0.5" />
                    <div className="w-1.5 h-1.5 bg-white rounded-full mb-0.5" />
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); onSwipeRight(); }}
                    className="w-16 h-16 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
                >
                    <Heart size={32} className="text-white fill-white" />
                </button>
            </div>
        </motion.div>
    );
};

export default SwipeableJobCard;
