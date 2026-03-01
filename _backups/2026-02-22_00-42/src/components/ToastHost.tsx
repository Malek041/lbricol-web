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

const VARIANT_STYLES: Record<ToastVariant, { bg: string; text: string; icon: React.ReactNode }> = {
    success: { bg: 'bg-black', text: 'text-white', icon: <CheckCircle2 size={22} className="text-white" /> },
    error: { bg: 'bg-[#111111]', text: 'text-white', icon: <AlertTriangle size={22} className="text-white" /> },
    info: { bg: 'bg-black', text: 'text-white', icon: <Info size={22} className="text-white" /> },
};

const ToastHost = ({ toasts, onDismiss }: ToastHostProps) => (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
            {toasts.map((toast) => {
                const variant = toast.variant || 'info';
                const style = VARIANT_STYLES[variant];
                return (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 250 }}
                        className={`min-w-[280px] max-w-[520px] ${style.bg} ${style.text} px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 pointer-events-auto`}
                        onClick={() => onDismiss(toast.id)}
                        role="status"
                        aria-live="polite"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                            {style.icon}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-sm">{toast.title}</p>
                            {toast.description && (
                                <p className="text-[11px] font-medium text-white/70 mt-0.5">{toast.description}</p>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </AnimatePresence>
    </div>
);

export default ToastHost;
