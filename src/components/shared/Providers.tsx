"use client";

import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { OrderProvider } from "@/context/OrderContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <ToastProvider>
                    <OrderProvider>
                        {children}
                    </OrderProvider>
                </ToastProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}
