"use client";

import React from 'react';
import { motion } from 'framer-motion';

const SplashScreen = () => {
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
            {/* Background Blobs - very subtle */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 45, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-5%] right-[-10%] w-[300px] h-[300px] opacity-[0.05] bg-[#FFC244]"
                style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
            />
            <motion.div
                animate={{ scale: [1.1, 1, 1.1], rotate: [0, -45, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-5%] left-[-10%] w-[350px] h-[350px] opacity-[0.05] bg-[#00A082]"
                style={{ borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' }}
            />

            <div className="relative flex flex-col items-center justify-center z-10 w-full max-h-full">
                {/* Waving Text Section */}
                <div className="flex flex-wrap items-center justify-center gap-0 mb-8 sm:mb-12">
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
                                fontSize: 'clamp(48px, 12vw, 82px)',
                                fontWeight: 950,
                                color: '#111',
                                fontFamily: 'var(--font-outfit), sans-serif',
                                letterSpacing: '-0.05em',
                                display: 'inline-block'
                            }}
                        >
                            {char}
                        </motion.span>
                    ))}
                    <motion.span
                        animate={{
                            y: [0, -12, 0],
                            scale: [1, 1.02, 1],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.7
                        }}
                        style={{
                            fontSize: 'clamp(48px, 12vw, 82px)',
                            fontWeight: 950,
                            color: '#00A082',
                            fontFamily: 'var(--font-outfit), sans-serif',
                            letterSpacing: '-0.05em',
                            display: 'inline-block'
                        }}
                    >
                        .com
                    </motion.span>
                </div>

                {/* Subtle Loading Line */}
                <div className="w-24 h-1 bg-neutral-100 rounded-full overflow-hidden">
                    <motion.div
                        animate={{ x: [-100, 100] }}
                        transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                        className="w-full h-full bg-[#FFC244]"
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default SplashScreen;
