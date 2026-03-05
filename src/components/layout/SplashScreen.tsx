"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

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
                overflow: 'hidden'
            }}
        >
            {/* Background Blobs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] opacity-10 bg-[#FFC244]"
                style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
            />
            <motion.div
                animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] opacity-10 bg-[#00A082]"
                style={{ borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' }}
            />

            <div className="relative flex flex-col items-center justify-center z-10">
                {/* Logo Animation */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.5 }}
                    className="mb-6"
                >
                    <Image
                        src="/Images/Logo/theEggOfLB.png"
                        alt="Lbricol Logo"
                        width={120}
                        height={120}
                        className="drop-shadow-2xl"
                    />
                </motion.div>

                {/* Animated Brand Text */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    {"Lbricol".split("").map((char, i) => (
                        <motion.span
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                delay: 0.5 + (i * 0.08),
                                duration: 0.5
                            }}
                            style={{
                                fontSize: '42px',
                                fontWeight: 950,
                                color: '#000000',
                                fontFamily: 'Uber Move, var(--font-sans)',
                                letterSpacing: '-0.02em'
                            }}
                        >
                            {char}
                        </motion.span>
                    ))}
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        style={{
                            fontSize: '42px',
                            fontWeight: 950,
                            color: '#00A082',
                            fontFamily: 'Uber Move, var(--font-sans)',
                            letterSpacing: '-0.02em'
                        }}
                    >
                        .com
                    </motion.span>
                </div>

                {/* Loading Line */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: 120 }}
                    transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
                    style={{
                        height: '4px',
                        backgroundColor: '#FFC244',
                        borderRadius: '2px',
                        marginTop: '20px'
                    }}
                />
            </div>
        </motion.div>
    );
};

export default SplashScreen;
