"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
    subStatus?: string | null;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ subStatus }) => {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                backgroundColor: '#FFC244',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '20px'
            }}
        >
            <div className="relative flex flex-col items-center justify-center z-10 w-full max-h-full">
                {/* Waving Text Section */}
                <div className="flex flex-wrap items-center justify-center gap-0 mb-8 sm:mb-12" dir="ltr">
                    {"Lbricol".split("").map((char, i) => (
                        <motion.span
                            key={i}
                            animate={{
                                y: [0, -12, 0],
                                scale: [1, 1.02, 1],
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.1
                            }}
                            style={{
                                fontSize: 'clamp(48px, 18vw, 72px)',
                                fontWeight: 500,
                                color: '#00A082',
                                fontFamily: 'var(--font-outfit), sans-serif',
                                letterSpacing: '-0.05em',
                                display: 'inline-block'
                            }}
                        >
                            {char}
                        </motion.span>
                    ))}
                </div>

                {/* Status Message */}
                <AnimatePresence>
                    {subStatus && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-[#00A082] rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-[#00A082] rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 bg-[#00A082] rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                            <span className="text-[#00A082] text-[13px] font-black uppercase tracking-[0.2em] text-center max-w-[280px]">
                                {subStatus}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default SplashScreen;
