"use client";

import React, { useState } from 'react';
import {
    X, ChevronRight, User, Mail, Lock, Phone,
    CreditCard, FileText, Megaphone, ShoppingBag, Gift,
    Tag, Bell, LogOut, ArrowLeft, Globe, Wrench, LogIn, Plus, CircleHelp
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileViewProps {
    onLogout?: () => void;
    onLogin?: () => void;
    onOpenLanguage?: () => void;
    onBricolerAction?: () => void;
    isBricoler?: boolean;
    isAuthenticated?: boolean;
    onNavigate?: (path: string) => void;
    userAvatar?: string;
    userName?: string;
    variant?: 'client' | 'provider';
}

const ProfileView: React.FC<ProfileViewProps> = ({
    onLogout,
    onLogin,
    onOpenLanguage,
    onBricolerAction,
    isBricoler = false,
    isAuthenticated = false,
    onNavigate,
    userAvatar,
    userName,
    variant = 'client'
}) => {
    const { t } = useLanguage();
    const [view, setView] = useState<'main' | 'info'>('main');

    const displayName = userName || (isAuthenticated ? 'User' : 'Guest');

    const handleHelp = () => {
        window.open('https://wa.me/212702814355', '_blank');
    };

    const renderMainView = () => {
        const providerItems = [
            ...(onBricolerAction ? [{
                icon: User,
                label: t({ en: 'Switch to Client Mode', fr: 'Passer en Mode Client' }),
                action: onBricolerAction
            }] : []),
            {
                icon: Plus,
                label: t({ en: 'Add other services', fr: 'Ajouter d\'autres services' }),
                action: () => onNavigate?.('/add-services'),
            },
            {
                icon: Globe,
                label: t({ en: 'Languages and currency', fr: 'Langues et devise' }),
                action: () => onOpenLanguage?.() || onNavigate?.('/languages'),
            },
            {
                icon: CircleHelp,
                label: t({ en: 'F.A.Q.', fr: 'F.A.Q.' }),
                action: handleHelp,
            },
            {
                icon: Bell,
                label: t({ en: 'Notifications', fr: 'Notifications' }),
                action: () => onNavigate?.('/notifications'),
            },
        ];

        const clientItems = [
            {
                icon: ShoppingBag,
                label: t({ en: 'My orders', fr: 'Mes commandes' }),
                action: () => onNavigate?.('/orders'), // Adjust based on your routing
            },
            {
                icon: User,
                label: t({ en: 'My information', fr: 'Mes informations' }),
                action: () => setView('info'),
            },
            ...(onBricolerAction ? [{
                icon: Wrench,
                label: isBricoler
                    ? t({ en: 'Switch to Provider', fr: 'Passer en Mode Prestataire' })
                    : t({ en: 'Become a Bricoler!', fr: 'Devenir un Bricoleur !' }),
                action: onBricolerAction
            }] : []),
            {
                icon: Globe,
                label: t({ en: 'Languages and currency', fr: 'Langues et devise' }),
                action: () => onOpenLanguage?.() || onNavigate?.('/languages'),
            },
            {
                icon: Gift,
                label: t({ en: 'Share and earn!', fr: 'Partagez et gagnez !' }),
                action: () => onNavigate?.('/share'),
            },
            {
                icon: Tag,
                label: t({ en: 'Promocodes', fr: 'Codes promo' }),
                action: () => onNavigate?.('/promocodes'),
            },
            {
                icon: CircleHelp,
                label: t({ en: 'F.A.Q.', fr: 'F.A.Q.' }),
                action: handleHelp,
            },
            {
                icon: Bell,
                label: t({ en: 'Notifications', fr: 'Notifications' }),
                action: () => onNavigate?.('/notifications'),
            },
        ];

        const menuItems = variant === 'provider' ? providerItems : clientItems;

        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col min-h-[100dvh] bg-[#FFC244] relative" // no bottom padding - nav is outside
            >
                {/* Yellow Header (Glovo Style) */}
                <div className="bg-[#FFC244] pt-12 pb-8 px-5 relative">
                    <div className="flex justify-between items-start mb-6">
                        {/* Close button - could map to a tab reset or home action. Let's make it go to home if onNavigate exists */}
                        <button
                            onClick={() => onNavigate?.('/home')}
                            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5"
                        >
                            <X size={26} className="text-black" />
                        </button>

                        {/* Help Button */}
                        <button
                            onClick={handleHelp}
                            className="bg-[#00A082] text-white px-4 py-2 rounded-full font-bold text-[15px] flex items-center gap-2"
                        >
                            <CircleHelp size={18} fill="white" stroke="#00A082" strokeWidth={1.5} />
                            {t({ en: 'Help', fr: 'Aide' })}
                        </button>
                    </div>

                    <h1 className="text-[28px] font-black text-black">
                        {t({ en: `Hello, ${displayName}!`, fr: `Bonjour, ${displayName} !` })}
                    </h1>
                </div>

                {/* Account List Wrapper */}
                <div className="bg-white rounded-t-[24px] -mt-6 relative z-10 px-5 pt-8 flex-1">
                    <h2 className="text-[20px] font-bold text-black mb-4">
                        {t({ en: 'Account', fr: 'Compte' })}
                    </h2>

                    <div className="space-y-1">
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={item.action}
                                    className="w-full flex items-center justify-between py-5 border-b border-[#F0F0F0] hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-6 flex justify-center">
                                            <Icon size={24} className="text-[#333333]" strokeWidth={1.5} />
                                        </div>
                                        <span className="text-[17px] text-[#1D1D1D] font-medium">{item.label}</span>
                                    </div>
                                    <ChevronRight size={22} className="text-[#B3B3B3]" />
                                </button>
                            );
                        })}

                        {/* Logout / Login Item */}
                        {isAuthenticated ? (
                            <button
                                onClick={onLogout}
                                className="w-full flex items-center justify-between py-5 border-b border-[#F0F0F0] hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-6 flex justify-center">
                                        <LogOut size={24} className="text-[#333333]" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[17px] text-[#1D1D1D] font-medium">{t({ en: 'Log out', fr: 'Déconnexion' })}</span>
                                </div>
                                <div className="w-6 h-[2px] rounded-full bg-black mt-2 hidden"></div> {/* Hidden to match design or keep it if needed */}
                            </button>
                        ) : (
                            <button
                                onClick={onLogin}
                                className="w-full flex items-center justify-between py-5 border-b border-[#F0F0F0] hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-6 flex justify-center">
                                        <LogIn size={24} className="text-[#333333]" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[17px] text-[#1D1D1D] font-medium">{t({ en: 'Log in or sign up', fr: 'Se connecter ou s\'inscrire' })}</span>
                                </div>
                                <ChevronRight size={22} className="text-[#B3B3B3]" />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderInfoView = () => {
        const infoItems = [
            { icon: User, label: displayName, hasChevron: false },
            { icon: Mail, label: 'user@email.com', hasChevron: false }, // Placeholder
            { icon: Lock, label: t({ en: 'Change password', fr: 'Changer le mot de passe' }), hasChevron: true },
            { icon: Phone, label: t({ en: 'Change phone number', fr: 'Changer le numéro de téléphone' }), hasChevron: true },
            { icon: CreditCard, label: t({ en: 'Payment methods', fr: 'Moyens de paiement' }), hasChevron: true },
            { icon: FileText, label: t({ en: 'Invoice information', fr: 'Informations de facturation' }), hasChevron: true },
            { icon: Megaphone, label: t({ en: 'Manage privacy', fr: 'Gérer la confidentialité' }), hasChevron: true },
        ];

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col min-h-[100dvh] bg-white relative pb-24"
            >
                {/* Header matching Picture 2 */}
                <div className="pt-12 px-5 pb-4 bg-white sticky top-0 z-20">
                    <button
                        onClick={() => setView('main')}
                        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5"
                    >
                        <ArrowLeft size={24} className="text-black" />
                    </button>
                </div>

                <div className="px-5 space-y-2 mt-2">
                    {infoItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={index}
                                className={`w-full flex items-center justify-between py-4 ${index !== infoItems.length - 1 ? 'border-b border-[#F0F0F0]' : ''} hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left`}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-6 flex justify-center">
                                        <Icon size={24} className="text-[#333333]" strokeWidth={1.2} />
                                    </div>
                                    <span className="text-[17px] text-[#1D1D1D] font-medium leading-tight">
                                        {item.label}
                                    </span>
                                </div>
                                {item.hasChevron && (
                                    <ChevronRight size={20} className="text-[#B3B3B3]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="w-full h-full bg-white relative">
            <AnimatePresence mode="wait">
                {view === 'main' ? (
                    <div key="main-view" className="w-full h-full absolute inset-0">
                        {renderMainView()}
                    </div>
                ) : (
                    <div key="info-view" className="w-full h-full absolute inset-0">
                        {renderInfoView()}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileView;
