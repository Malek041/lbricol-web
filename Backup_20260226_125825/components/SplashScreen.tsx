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
                backgroundColor: '#FFC244', // Signature Lbricol Yellow
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}
        >
            <div className="relative flex flex-col items-center">
                {/* Logo with looping animation */}
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{ width: '180px', height: '180px' }}
                >
                    <img
                        src="/Images/Logo/LbricolYellowFaceLogo.png"
                        alt="Lbricol Logo"
                        className="w-full h-full object-contain"
                    />
                </motion.div>

                {/* Optional: Subtle pulse effect under the logo */}
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.1, 0.3, 0.1]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        position: 'absolute',
                        bottom: '-20px',
                        width: '120px',
                        height: '20px',
                        backgroundColor: 'black',
                        borderRadius: '50%',
                        filter: 'blur(15px)',
                        zIndex: -1
                    }}
                />
            </div>
        </motion.div>
    );
};

export default SplashScreen;
