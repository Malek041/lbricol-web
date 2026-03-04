"use client";

import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <DataProvider>
                    <LanguageProvider>
                        <ToastProvider>
                            {children}
                        </ToastProvider>
                    </LanguageProvider>
                </DataProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
