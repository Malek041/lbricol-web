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
                zIndex: 9999,
                backgroundColor: '#F7F6F6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}
        >
            <div className="relative flex-1 flex flex-col items-center justify-center w-full px-10">
                {/* Zigzagging Wave Lbricol Text */}
                <h1
                    dir="ltr"
                    className="text-[92px] font-[1000] tracking-[-0.07em] leading-tight flex"
                    style={{ color: '#00A082', fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                    {"Lbricol".split("").map((char, i) => (
                        <motion.span
                            key={i}
                            animate={{
                                y: [0, -20, 0],
                                scale: [1, 1.05, 1],
                                opacity: [1, 0.7, 1]
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.12
                            }}
                        >
                            {char}
                        </motion.span>
                    ))}
                </h1>
            </div>


        </motion.div>
    );
};

export default SplashScreen;
