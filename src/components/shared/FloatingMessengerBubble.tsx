"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';

interface FloatingMessengerBubbleProps {
    avatar?: string;
    count: number;
    jobId: string;
    onOpen: (jobId: string) => void;
    onDismiss: () => void;
}

export const FloatingMessengerBubble: React.FC<FloatingMessengerBubbleProps> = ({ 
    avatar, 
    count, 
    jobId, 
    onOpen, 
    onDismiss 
}) => {
    return (
        <AnimatePresence>
            <motion.div
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Elastic drag
                dragElastic={0.6}
                initial={{ opacity: 0, scale: 0.5, x: 200 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.5, x: 200 }}
                style={{
                    position: 'fixed',
                    right: '25px',
                    top: '25%',
                    zIndex: 10000,
                    cursor: 'grab'
                }}
                whileTap={{ cursor: 'grabbing' }}
            >
                <div className="relative">
                    {/* Main Bubble */}
                    <div 
                        onClick={() => onOpen(jobId)}
                        className="w-[70px] h-[70px] rounded-full bg-white shadow-2xl border-[3px] border-[#01A083] overflow-hidden flex items-center justify-center p-0.5"
                    >
                        {avatar ? (
                            <img src={avatar} alt="Sender" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-[#f9fafb] flex items-center justify-center text-[#01A083]">
                                <MessageSquare size={28} />
                            </div>
                        )}
                    </div>

                    {/* Red Count Badge */}
                    {count > 0 && (
                        <div className="absolute top-0 right-0 w-7 h-7 bg-[#FF3B30] border-2 border-white rounded-full flex items-center justify-center text-white text-[12px] font-[1000]">
                            {count}
                        </div>
                    )}

                    {/* Small Dismiss Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onDismiss();
                        }}
                        className="absolute -top-2 -left-2 w-7 h-7 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-95 transition-transform"
                    >
                        <X size={14} />
                    </button>

                    {/* Messenger Animation Ring */}
                    <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 rounded-full border-[6px] border-[#01A083] pointer-events-none"
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
