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
                backgroundColor: '#FFFFFF',
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
                                fontSize: 'clamp(48px, 22vw, 82px)',
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
                {subStatus ? (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            color: '#0F7F71',
                            fontSize: 'clamp(14px, 3vw, 18px)',
                            fontWeight: 700,
                            textAlign: 'center',
                            maxWidth: '85vw'
                        }}
                    >
                        {subStatus}
                    </motion.p>
                ) : null}
            </div>
        </motion.div>
    );
};

export default SplashScreen;
