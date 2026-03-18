"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft } from 'lucide-react';

interface ServiceFlowLayoutProps {
    children: React.ReactNode;
    mapContent: React.ReactNode;
    footerContent: React.ReactNode;
    step: number;
    onBack: () => void;
    showBack?: boolean;
    isEmbedded?: boolean;
}

export default function ServiceFlowLayout({
    children,
    mapContent,
    footerContent,
    step,
    onBack,
    showBack = true,
    isEmbedded = false
}: ServiceFlowLayoutProps) {
    const content = (
        <div className={cn(
            "bg-white relative flex flex-col overflow-hidden",
            isEmbedded ? "" : "flex-1 rounded-t-[24px] -mt-6 z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.06)]"
        )}>
            {/* Scrollable Content Area */}
            <div className={cn("flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8", isEmbedded ? "pb-4" : "pb-32")}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={cn("pt-8", !isEmbedded && "min-h-full")}
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Fixed Navigation Bar inside the Sheet */}
            {(showBack || footerContent) && (
                <div className={cn(
                    "absolute bottom-0 left-0 right-0 p-5 pb-8 flex items-center gap-4 z-20",
                    isEmbedded ? "bg-transparent pointer-events-none" : "bg-white/80 backdrop-blur-md border-t border-neutral-100"
                )}>
                    {showBack && (
                        <button
                            onClick={onBack}
                            className={cn(
                                "w-12 h-12 flex items-center justify-center rounded-full transition-transform active:scale-90 pointer-events-auto",
                                isEmbedded ? "bg-white shadow-lg" : "bg-neutral-100 text-neutral-900"
                            )}
                        >
                            <ChevronLeft size={24} strokeWidth={2.5} />
                        </button>
                    )}
                    <div className="flex-1 pointer-events-auto">
                        {footerContent}
                    </div>
                </div>
            )}
        </div>
    );

    if (isEmbedded) return content;

    return (
        <div className="fixed inset-0 z-[3000] bg-white flex flex-col overflow-hidden h-[100dvh] w-screen pointer-events-auto font-jakarta">
            {/* 1. Map Section (~40% height) */}
            <div className="h-[40vh] w-full relative flex-shrink-0 bg-neutral-100 overflow-hidden">
                {mapContent}
            </div>

            {/* 2. Bottom Sheet Container (~60% height) */}
            {content}
        </div>
    );
}
