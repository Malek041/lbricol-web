"use client";

import React, { useState } from 'react';
import {
    X, ChevronRight, User, Mail, Lock, Phone,
    CreditCard, FileText, Megaphone, ShoppingBag, Gift,
    Tag, Bell, LogOut, ArrowLeft, Globe, Wrench, LogIn, Plus, CircleHelp, Shield, UserPlus
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Trash2, Image as ImageIcon } from 'lucide-react';

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
    userEmail?: string;
    variant?: 'client' | 'provider' | 'admin';
    onAdminAction?: (code?: string) => void;
    isAdmin?: boolean;
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
    userEmail,
    variant = 'client',
    onAdminAction,
    isAdmin = false,
}) => {
    const { t } = useLanguage();
    const [view, setView] = useState<'main' | 'info' | 'admin-code' | 'portfolio'>('main');
    const [adminCode, setAdminCode] = useState('');
    const [portfolio, setPortfolio] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [editingField, setEditingField] = useState<'none' | 'name' | 'email'>('none');
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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
                icon: ImageIcon,
                label: t({ en: 'Work Portfolio', fr: 'Portfolio de réalisations' }),
                action: async () => {
                    // Fetch existing portfolio
                    const user = auth.currentUser;
                    if (user) {
                        const docSnap = await getDoc(doc(db, 'bricolers', user.uid));
                        if (docSnap.exists()) {
                            setPortfolio(docSnap.data().portfolio || []);
                        }
                    }
                    setView('portfolio');
                },
            },
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
                label: t({ en: 'Orders History', fr: 'Historique des commandes' }),
                action: () => onNavigate?.('/orders-history'), // Adjust based on your routing
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
            {
                icon: Shield,
                label: t({ en: 'Admins', fr: 'Administration' }),
                action: () => isAdmin ? onAdminAction?.() : setView('admin-code'),
            },
        ];

        const adminItems = [
            {
                icon: UserPlus,
                label: t({ en: 'Create Bricoler Profile', fr: 'Créer Profil Bricoleur' }),
                action: () => onNavigate?.('/admin/create-bricoler'),
            },
            {
                icon: Shield,
                label: t({ en: 'Exit Admin Mode', fr: 'Quitter le mode Admin' }),
                action: () => onAdminAction?.(),
            },
            {
                icon: Globe,
                label: t({ en: 'Languages and currency', fr: 'Langues et devise' }),
                action: () => onOpenLanguage?.() || onNavigate?.('/languages'),
            },
        ];

        const menuItems = variant === 'admin' ? adminItems : (variant === 'provider' ? providerItems : clientItems);

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

                    <div className="flex items-center gap-4">
                        {userAvatar && (
                            <div className="w-16 h-16 rounded-3xl overflow-hidden bg-white/20 border-2 border-white/30">
                                <img src={userAvatar} alt={displayName} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <h1 className="text-[28px] font-black text-black">
                            {t({ en: `Hello, ${displayName}!`, fr: `Bonjour, ${displayName} !` })}
                        </h1>
                    </div>
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

    const handleSaveEdit = async () => {
        if (!auth.currentUser || !editValue.trim()) {
            setEditingField('none');
            return;
        }

        setIsSaving(true);
        try {
            const user = auth.currentUser;
            const clientUpdate: any = {};

            if (editingField === 'name') {
                clientUpdate.name = editValue.trim();
            } else if (editingField === 'email') {
                clientUpdate.email = editValue.trim();
            }

            // Update Firestore
            const clientRef = doc(db, 'clients', user.uid);
            await updateDoc(clientRef, clientUpdate);

            // Update Auth Profile if name
            if (editingField === 'name') {
                const { updateProfile } = await import('firebase/auth');
                await updateProfile(user, { displayName: editValue.trim() });
            }

            setEditingField('none');
        } catch (err) {
            console.error("Error saving profile:", err);
            alert("Failed to save changes. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderInfoView = () => {
        const infoItems = [
            { icon: User, label: displayName, hasChevron: true },
            { icon: Mail, label: userEmail || 'user@email.com', hasChevron: true },
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
                        const isName = index === 0;
                        const isEmail = index === 1;
                        const isEditingThis = (isName && editingField === 'name') || (isEmail && editingField === 'email');

                        return (
                            <div key={index} className={`w-full ${index !== infoItems.length - 1 ? 'border-b border-[#F0F0F0]' : ''}`}>
                                {isEditingThis ? (
                                    <div className="py-4 flex flex-col gap-3">
                                        <div className="flex items-center gap-5">
                                            <div className="w-6 flex justify-center">
                                                <Icon size={24} className="text-[#00A082]" strokeWidth={1.5} />
                                            </div>
                                            <input
                                                autoFocus
                                                type={isEmail ? "email" : "text"}
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="flex-1 text-[17px] text-[#1D1D1D] font-medium leading-tight outline-none border-b-2 border-[#00A082] py-1"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setEditingField('none')}
                                                className="px-4 py-2 text-[14px] font-bold text-neutral-500"
                                            >
                                                {t({ en: 'Cancel', fr: 'Annuler' })}
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={isSaving}
                                                className="px-4 py-2 bg-[#00A082] text-white rounded-full text-[14px] font-bold disabled:opacity-50"
                                            >
                                                {isSaving ? '...' : t({ en: 'Save', fr: 'Enregistrer' })}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (isName) {
                                                setEditingField('name');
                                                setEditValue(displayName);
                                            } else if (isEmail) {
                                                setEditingField('email');
                                                setEditValue(userEmail || '');
                                            }
                                        }}
                                        className="w-full flex items-center justify-between py-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-6 flex justify-center">
                                                <Icon size={24} className="text-[#333333]" strokeWidth={1.2} />
                                            </div>
                                            <span className="text-[17px] text-[#1D1D1D] font-medium leading-tight">
                                                {isEmail ? (userEmail || 'user@email.com') : item.label}
                                            </span>
                                        </div>
                                        {(item.hasChevron || isName || isEmail) && (
                                            <ChevronRight size={20} className="text-[#B3B3B3]" />
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </motion.div>
        );
    };

    const renderPortfolioView = () => {
        const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(e.target.files || []);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string;
                    setIsUploading(true);
                    try {
                        const user = auth.currentUser;
                        if (user) {
                            await updateDoc(doc(db, 'bricolers', user.uid), {
                                portfolio: arrayUnion(base64)
                            });
                            setPortfolio(prev => [...prev, base64]);
                        }
                    } catch (err) {
                        console.error("Upload error:", err);
                    } finally {
                        setIsUploading(false);
                    }
                };
                reader.readAsDataURL(file);
            });
        };

        const handleRemove = async (url: string) => {
            try {
                const user = auth.currentUser;
                if (user) {
                    await updateDoc(doc(db, 'bricolers', user.uid), {
                        portfolio: arrayRemove(url)
                    });
                    setPortfolio(prev => prev.filter(p => p !== url));
                }
            } catch (err) {
                console.error("Remove error:", err);
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col min-h-[100dvh] bg-white relative pb-24"
            >
                <div className="pt-12 px-5 pb-4 bg-white sticky top-0 z-20 flex items-center justify-between">
                    <button onClick={() => setView('main')} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5">
                        <ArrowLeft size={24} className="text-black" />
                    </button>
                    <h2 className="text-[18px] font-black">{t({ en: 'Your Portfolio', fr: 'Votre Portfolio' })}</h2>
                    <div className="w-10" />
                </div>

                <div className="px-5 mt-4">
                    <p className="text-neutral-500 text-[14px] mb-6 font-medium">
                        {t({
                            en: 'Upload photos of your best work to show clients what you can do.',
                            fr: 'Téléchargez des photos de vos meilleures réalisations pour montrer aux clients votre savoir-faire.'
                        })}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Upload Button */}
                        <label className="relative aspect-square rounded-[32px] border-2 border-dashed border-[#FFC244] bg-[#FFC244]/5 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FFC244]/10 transition-all group overflow-hidden">
                            <input type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
                            {isUploading ? (
                                <div className="w-8 h-8 border-4 border-[#FFC244]/30 border-t-[#FFC244] rounded-full animate-spin" />
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-[#FFC244] rounded-2xl flex items-center justify-center text-white mb-2 shadow-lg shadow-[#FFC244]/20 group-hover:scale-110 transition-transform">
                                        <Plus size={24} strokeWidth={3} />
                                    </div>
                                    <span className="text-[14px] font-bold text-[#FFC244]">{t({ en: 'Add Photos', fr: 'Ajouter' })}</span>
                                </>
                            )}
                        </label>

                        {/* Portfolio Images */}
                        {portfolio.map((url, i) => (
                            <div key={i} className="relative aspect-square rounded-[32px] overflow-hidden border border-neutral-100 shadow-sm group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemove(url)}
                                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderAdminCodeView = () => {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col min-h-[100dvh] bg-[#FFC244] p-5 justify-center items-center"
            >
                <div className="bg-white w-full max-w-sm rounded-[10px] p-8 ">
                    <div className="w-16 h-16 bg-[#FFC244]/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                        <Shield size={32} className="text-black" />
                    </div>

                    <h2 className="text-2xl font-black text-center mb-2">
                        {t({ en: 'Admin Access', fr: 'Accès Admin' })}
                    </h2>
                    <p className="text-center text-neutral-500 mb-8 whitespace-pre-line">
                        {t({
                            en: 'Please enter the secret code\nto access the admin portal.',
                            fr: 'Veuillez saisir le code secret\npour accéder au portail admin.'
                        })}
                    </p>

                    <input
                        type="password"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        placeholder="••••••"
                        className="w-full h-14 bg-neutral-100 rounded-1xl px-5 text-center text-2xl tracking-[0.5em] font-bold focus:bg-white focus:ring-2 focus:ring-[#FFC244] transition-all outline-none mb-6"
                        autoFocus
                    />

                    <div className="flex gap-3">
                        <button
                            onClick={() => setView('main')}
                            className="flex-1 h-14 rounded-2xl font-bold text-neutral-500 hover:bg-neutral-100 transition-colors"
                        >
                            {t({ en: 'Cancel', fr: 'Annuler' })}
                        </button>
                        <button
                            onClick={() => {
                                setIsVerifying(true);
                                onAdminAction?.(adminCode);
                                // The parent will handle the transition, or error
                                setTimeout(() => setIsVerifying(false), 1000);
                            }}
                            disabled={isVerifying || !adminCode}
                            className="flex-1 h-14 bg-black text-white rounded-2xl font-bold hover:bg-neutral-800 disabled:opacity-50 transition-all"
                        >
                            {isVerifying ? '...' : t({ en: 'Access', fr: 'Accéder' })}
                        </button>
                    </div>
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
                ) : view === 'info' ? (
                    <div key="info-view" className="w-full h-full absolute inset-0">
                        {renderInfoView()}
                    </div>
                ) : view === 'portfolio' ? (
                    <div key="portfolio-view" className="w-full h-full absolute inset-0">
                        {renderPortfolioView()}
                    </div>
                ) : (
                    <div key="admin-code-view" className="w-full h-full absolute inset-0 z-50">
                        {renderAdminCodeView()}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileView;
