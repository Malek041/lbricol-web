"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ToastHost, { ToastItem, ToastVariant } from '@/components/shared/ToastHost';

interface ToastContextValue {
    showToast: (toast: Omit<ToastItem, 'id'> & { duration?: number }) => void;
    dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3500;

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((toast: Omit<ToastItem, 'id'> & { duration?: number }) => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const item: ToastItem = {
            id,
            title: toast.title,
            description: toast.description,
            variant: toast.variant as ToastVariant
        };
        setToasts(prev => [...prev, item]);
        const duration = toast.duration ?? DEFAULT_DURATION;
        if (duration > 0) {
            window.setTimeout(() => dismissToast(id), duration);
        }
    }, [dismissToast]);

    const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastHost toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return ctx;
};
