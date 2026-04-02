"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
}

interface ToastHostProps {
    toasts: ToastItem[];
    onDismiss: (id: string) => void;
}

const VARIANT_STYLES: Record<ToastVariant, { bg: string; text: string; icon: React.ReactNode; border: string }> = {
    success: {
        bg: 'bg-[#01A083]/90 backdrop-blur-md',
        text: 'text-white',
        icon: <CheckCircle2 size={22} className="text-white" />,
        border: 'border-[#008C74]/20'
    },
    error: {
        bg: 'bg-rose-500/90 backdrop-blur-md',
        text: 'text-white',
        icon: <AlertTriangle size={22} className="text-white" />,
        border: 'border-rose-400/20'
    },
    info: {
        bg: 'bg-white/80 backdrop-blur-md',
        text: 'text-[#1D1D1D]',
        icon: <Info size={22} className="text-[#01A083]" />,
        border: 'border-neutral-200/50'
    },
};

const ToastHost = ({ toasts, onDismiss }: ToastHostProps) => (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[5000] flex flex-col gap-3 pointer-events-none w-full max-w-[90%] md:max-w-md items-center">
        <AnimatePresence>
            {toasts.map((toast) => {
                const variant = toast.variant || 'info';
                const style = VARIANT_STYLES[variant];
                return (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className={`w-full ${style.bg} ${style.text} px-5 py-4 rounded-[24px] border ${style.border} shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center gap-4 pointer-events-auto cursor-pointer active:scale-[0.98] transition-all`}
                        onClick={() => onDismiss(toast.id)}
                        role="status"
                        aria-live="polite"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                            {style.icon}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-[15px] tracking-tight">{toast.title}</p>
                            {toast.description && (
                                <p className="text-[12px] font-bold opacity-80 mt-0.5 leading-snug">{toast.description}</p>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </AnimatePresence>
    </div>
);

export default ToastHost;
