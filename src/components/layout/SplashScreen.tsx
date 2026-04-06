"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import jumpingAnimation from '../../../public/Lottifiles Animation/jumping Lbricol.json';


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
                backgroundColor: '#FFB700', // Brand Yellow
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '20px'
            }}
        >
            <div className="relative flex flex-col items-center justify-center z-10 w-full max-w-[600px] -mt-[8dvh]">
                {/* Jumping Lottie Animation */}
                <div style={{ width: '100%', height: 'auto', maxHeight: '105dvh' }}>
                    <Lottie
                        animationData={jumpingAnimation}
                        loop={true}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>

                {/* Brand Name */}
                {/*  <motion.h1
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.3, type: 'spring' }}
                    style={{
                        fontSize: 'clamp(38px, 10vw, 76px)',
                        fontWeight: 650,
                        color: '#017C3E',
                        fontFamily: 'var(--font-sans-one), sans-serif',
                        marginTop: '-40px', // Pull it up to overlap slightly with the animation base
                        letterSpacing: '-0.04em'
                    }}
                >
                    Lbricol
                </motion.h1>*/}

                {subStatus ? (
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        style={{
                            color: '#01A083', // Dark Green
                            fontSize: 'clamp(14px, 3.5vw, 16px)',
                            fontWeight: 800,
                            textAlign: 'center',
                            maxWidth: '85vw',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            marginTop: '3.5rem',
                            opacity: 1
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
