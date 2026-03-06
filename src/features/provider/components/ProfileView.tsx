"use client";

import React, { useState, useMemo } from 'react';
import {
    X, ChevronRight, User, Mail, Lock, Phone,
    CreditCard, FileText, Megaphone, ShoppingBag, Gift,
    Tag, Bell, LogOut, ArrowLeft, Globe, Wrench, LogIn, Plus, CircleHelp, Shield, UserPlus,
    Camera, Trash2, Image as ImageIcon, ToggleLeft, ToggleRight, Hash
} from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '@/context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getServiceName, getServiceVector } from '@/config/services_config';
import OnboardingPopup from '@/features/onboarding/components/OnboardingPopup';

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
    userData?: any;
    setUserData?: (data: any) => void;
    initialView?: 'main' | 'info' | 'admin-code' | 'portfolio';
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
    userData,
    setUserData,
    initialView = 'main',
}) => {
    const { t } = useLanguage();
    const [view, setView] = useState<'main' | 'info' | 'admin-code' | 'portfolio'>(initialView);
    const [adminCode, setAdminCode] = useState('');
    const [portfolio, setPortfolio] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [editingField, setEditingField] = useState<'none' | 'name' | 'email' | 'bankName' | 'cardHolderName' | 'rib' | 'phone'>('none');
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // Onboarding Mode Popup state
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [onboardingMode, setOnboardingMode] = useState<'edit' | 'add'>('edit');
    const [onboardingInitialCat, setOnboardingInitialCat] = useState<any>(null);

    const displayName = userName || (isAuthenticated
        ? t({ en: 'User', fr: 'Utilisateur', ar: 'مستخدم' })
        : t({ en: 'Guest', fr: 'Invité', ar: 'زائر' }));

    const handleHelp = () => {
        window.open('https://wa.me/212702814355', '_blank');
    };

    const renderMainView = () => {
        const providerItems = [
            ...(onBricolerAction ? [{
                icon: User,
                label: t({ en: 'Switch to Client Mode', fr: 'Passer en Mode Client', ar: 'التحويل إلى وضع العميل' }),
                action: onBricolerAction
            }] : []),
            {
                icon: ShoppingBag,
                label: t({ en: 'Orders History', fr: 'Historique des commandes', ar: 'سجل الطلبات' }),
                action: () => onNavigate?.('/orders-history'),
            },
            {
                icon: User,
                label: t({ en: 'My information', fr: 'Mes informations', ar: 'معلوماتي' }),
                action: () => setView('info'),
            },
            {
                icon: Gift,
                label: t({ en: 'Promote yourself!', fr: 'Promouvez-vous !', ar: 'روّج لنفسك!' }),
                action: () => onNavigate?.('/promote'),
                badge: { text: t({ en: 'New', fr: 'Nouveau', ar: 'جديد' }), color: '#E91E8C' } as const
            },
            {
                icon: Tag,
                label: t({ en: 'Promocodes', fr: 'Codes promo', ar: 'أكواد الخصم' }),
                action: () => onNavigate?.('/promocodes'),
            },
            {
                icon: Globe,
                label: t({ en: 'Languages and currency', fr: 'Langues et devise', ar: 'اللغات والعملة' }),
                action: () => onOpenLanguage?.(),
            },
            {
                icon: CircleHelp,
                label: t({ en: 'F.A.Q.', fr: 'F.A.Q.', ar: 'الأسئلة الشائعة' }),
                action: handleHelp,
            },
        ];

        const clientItems = [
            ...(onBricolerAction ? [{
                icon: Wrench,
                label: isBricoler
                    ? t({ en: 'Switch to Provider', fr: 'Passer en Mode Prestataire', ar: 'التحويل إلى وضع مقدم الخدمة' })
                    : t({ en: 'Become a Bricoler!', fr: 'Devenir un Bricoleur !', ar: 'كن مقدم خدمة!' }),
                action: onBricolerAction,
                badge: isBricoler ? undefined : { text: t({ en: 'Recommended', fr: 'Recommandé', ar: 'موصى به' }), color: '#00A082' } as const
            }] : []),
            {
                icon: ShoppingBag,
                label: t({ en: 'Orders History', fr: 'Historique des commandes', ar: 'سجل الطلبات' }),
                action: () => onNavigate?.('/orders-history'),
            },
            {
                icon: User,
                label: t({ en: 'My information', fr: 'Mes informations', ar: 'معلوماتي' }),
                action: () => setView('info'),
            },
            {
                icon: Globe,
                label: t({ en: 'Languages and currency', fr: 'Langues et devise', ar: 'اللغات والعملة' }),
                action: () => onOpenLanguage?.(),
            },
            {
                icon: Gift,
                label: t({ en: 'Share and earn!', fr: 'Partagez et gagnez !', ar: 'شارك واربح!' }),
                action: () => onNavigate?.('/share'),
                badge: { text: t({ en: 'New', fr: 'Nouveau', ar: 'جديد' }), color: '#E91E8C' } as const
            },
            {
                icon: Tag,
                label: t({ en: 'Promocodes', fr: 'Codes promo', ar: 'أكواد الخصم' }),
                action: () => onNavigate?.('/promocodes'),
            },
            {
                icon: CircleHelp,
                label: t({ en: 'F.A.Q.', fr: 'F.A.Q.', ar: 'الأسئلة الشائعة' }),
                action: handleHelp,
            },
            {
                icon: Shield,
                label: t({ en: 'Admins', fr: 'Administration', ar: 'الإدارة' }),
                action: () => isAdmin ? onAdminAction?.() : setView('admin-code'),
            },
        ];

        const adminItems = [
            {
                icon: UserPlus,
                label: t({ en: 'Create Bricoler Profile', fr: 'Créer Profil Bricoleur', ar: 'إنشاء ملف مقدم خدمة' }),
                action: () => onNavigate?.('/admin/create-bricoler'),
            },
            {
                icon: Shield,
                label: t({ en: 'Exit Admin Mode', fr: 'Quitter le mode Admin', ar: 'الخروج من وضع الإدارة' }),
                action: () => onAdminAction?.(),
            },
            {
                icon: Globe,
                label: t({ en: 'Languages and currency', fr: 'Langues et devise', ar: 'اللغات والعملة' }),
                action: () => onOpenLanguage?.() || onNavigate?.('/languages'),
            },
        ];

        const menuItems = variant === 'admin' ? adminItems : (variant === 'provider' ? providerItems : clientItems);

        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col h-full overflow-y-auto no-scrollbar bg-white relative w-full"
            >
                {/* Yellow Header (Glovo Style) - Fixed/Sticky Behind */}
                <div className="bg-[#FFC244] pt-14 pb-20 px-6 sticky top-0 z-0 flex flex-col items-center overflow-hidden shrink-0 transition-all duration-300">
                    <div className="w-full flex justify-end mb-4 relative z-10">
                        {/* Help Button */}
                        <button
                            onClick={handleHelp}
                            className="bg-[#008C74] text-white px-5 py-2.5 rounded-full font-black text-[14px] flex items-center gap-2 active:scale-95 transition-all shadow-md group"
                        >
                            <CircleHelp size={18} className="text-white group-hover:rotate-12 transition-transform" />
                            {t({ en: 'Help', fr: 'Aide', ar: 'مساعدة' })}
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-5 text-center relative z-10">
                        <div className="relative group">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-28 h-28 rounded-[36px] overflow-hidden bg-white relative shadow-sm"
                            >
                                <img
                                    src={userAvatar || userData?.avatar || userData?.photoURL || "/Images/Vectors Illu/LbricolFaceOY.webp"}
                                    alt={displayName}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </motion.div>
                            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#00A082] rounded-2xl border-4 border-white flex items-center justify-center">
                                <Shield size={16} className="text-white" fill="white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-[36px] font-black text-black leading-tight tracking-tight">
                                {displayName}
                            </h1>
                            {isAuthenticated && (
                                <p className="text-[14px] font-bold text-black/40 uppercase tracking-widest">
                                    {variant === 'provider'
                                        ? t({ en: 'Provider account', fr: 'Compte prestataire', ar: 'حساب مقدم خدمة' })
                                        : variant === 'admin'
                                            ? t({ en: 'Admin account', fr: 'Compte admin', ar: 'حساب إداري' })
                                            : t({ en: 'Client account', fr: 'Compte client', ar: 'حساب عميل' })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-t-[20px] -mt-12 relative z-10 px-6 pt-10 w-full min-h-screen pb-48">


                    <div className="space-y-1">
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            const badge = (item as any).badge as { text: string; color: string } | undefined;
                            return (
                                <button
                                    key={index}
                                    onClick={item.action}
                                    className="w-full flex items-center justify-between py-3 border-b border-[#F0F0F0] hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-6 flex justify-center">
                                            <Icon size={20} className="text-[#333333]" strokeWidth={1.5} />
                                        </div>
                                        <span className="text-[17px] text-[#1D1D1D] font-light">{item.label}</span>
                                        {badge && (
                                            <span
                                                className="px-2 py-0.5 rounded-md text-[11px] font-black text-white"
                                                style={{ backgroundColor: badge.color }}
                                            >
                                                {badge.text}
                                            </span>
                                        )}
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
                                        <LogOut size={20} className="text-[#333333]" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[17px] text-[#1D1D1D] font-light">{t({ en: 'Log out', fr: 'Déconnexion', ar: 'تسجيل الخروج' })}</span>
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
                                        <LogIn size={20} className="text-[#333333]" strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[17px] text-[#1D1D1D] font-light">{t({ en: 'Log in or sign up', fr: 'Se connecter ou s\'inscrire', ar: 'تسجيل الدخول أو إنشاء حساب' })}</span>
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
        if (!auth.currentUser || (!editValue.trim() && !['bankName', 'cardHolderName', 'rib'].includes(editingField))) {
            setEditingField('none');
            return;
        }

        setIsSaving(true);
        try {
            const user = auth.currentUser;

            if (variant === 'provider') {
                const bricolerUpdate: any = {};
                if (editingField === 'bankName') bricolerUpdate.bankName = editValue.trim();
                else if (editingField === 'cardHolderName') bricolerUpdate.cardHolderName = editValue.trim();
                else if (editingField === 'rib') bricolerUpdate.rib = editValue.trim();
                else if (editingField === 'name') {
                    bricolerUpdate.name = editValue.trim();
                    bricolerUpdate.displayName = editValue.trim();
                }
                else if (editingField === 'email') bricolerUpdate.email = editValue.trim();
                else if (editingField === 'phone') {
                    bricolerUpdate.phone = editValue.trim();
                    bricolerUpdate.whatsappNumber = editValue.trim();
                }

                const providerRef = doc(db, 'bricolers', user.uid);
                await updateDoc(providerRef, bricolerUpdate);

                if (editingField === 'name' || editingField === 'email') {
                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        name: editingField === 'name' ? editValue.trim() : (userData?.name || ''),
                        email: editingField === 'email' ? editValue.trim() : (userData?.email || '')
                    });
                }
            } else {
                const profileUpdate: any = {};
                if (editingField === 'name') profileUpdate.name = editValue.trim();
                else if (editingField === 'email') profileUpdate.email = editValue.trim();

                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, profileUpdate);

                const clientRef = doc(db, 'clients', user.uid);
                const clientSnap = await getDoc(clientRef);
                if (clientSnap.exists()) {
                    await updateDoc(clientRef, profileUpdate);
                }
            }

            if (editingField === 'name' || editingField === 'email') {
                const { updateProfile } = await import('firebase/auth');
                if (editingField === 'name') await updateProfile(user, { displayName: editValue.trim() });
            }

            if (setUserData) {
                const newData = { ...userData };
                if (editingField === 'name') newData.name = editValue.trim();
                if (editingField === 'email') newData.email = editValue.trim();
                if (editingField === 'phone') newData.phone = editValue.trim();
                if (editingField === 'bankName') newData.bankName = editValue.trim();
                if (editingField === 'rib') newData.rib = editValue.trim();
                setUserData(newData);
            }

            setEditingField('none');
        } catch (err) {
            console.error("Error saving profile:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const user = auth.currentUser;
        if (!file || !user) return;

        setIsUploadingPhoto(true);
        try {
            const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_profile.jpg`);
            const uploadResult = await uploadBytes(storageRef, file, { contentType: 'image/jpeg' });
            const url = await getDownloadURL(uploadResult.ref);

            // Update Auth
            const { updateProfile } = await import('firebase/auth');
            await updateProfile(user, { photoURL: url });

            // Update Firestore
            const updates = { avatar: url, photoURL: url };
            await updateDoc(doc(db, 'users', user.uid), updates);
            if (variant === 'provider') {
                await updateDoc(doc(db, 'bricolers', user.uid), updates);
            } else {
                const clientRef = doc(db, 'clients', user.uid);
                const clientSnap = await getDoc(clientRef);
                if (clientSnap.exists()) await updateDoc(clientRef, updates);
            }

            if (setUserData) setUserData({ ...userData, avatar: url, photoURL: url });
        } catch (err) {
            console.error("Error updating photo:", err);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const renderInfoView = () => {
        if (variant === 'provider') {
            const bankNameVal = userData?.bankName || '';
            const cardHolderVal = userData?.cardHolderName || '';
            const ribVal = userData?.rib || '';

            const providerInfoItems = [
                { icon: User, label: t({ en: 'Full Name', fr: 'Nom complet', ar: 'الاسم الكامل' }), value: displayName, editable: true, field: 'name' },
                { icon: Mail, label: t({ en: 'Email address', fr: 'Adresse e-mail', ar: 'البريد الإلكتروني' }), value: userEmail || userData?.email || t({ en: 'N/A', fr: 'N/A', ar: 'غير متوفر' }), editable: true, field: 'email' },
                { icon: Phone, label: t({ en: 'Phone number', fr: 'Numéro de téléphone', ar: 'رقم الهاتف' }), value: userData?.phone || userData?.whatsappNumber || userData?.whatsapp || t({ en: 'N/A', fr: 'N/A', ar: 'غير متوفر' }), editable: true, field: 'phone' },
                { icon: FileText, label: t({ en: 'Bank Name', fr: 'Nom de la banque', ar: 'اسم البنك' }), value: bankNameVal || t({ en: 'Not set', fr: 'Non défini', ar: 'غير محدد' }), editable: true, field: 'bankName' },
                { icon: CreditCard, label: t({ en: 'Cardholder Name', fr: 'Nom du titulaire de la carte', ar: 'اسم صاحب البطاقة' }), value: cardHolderVal || t({ en: 'Not set', fr: 'Non défini', ar: 'غير محدد' }), editable: true, field: 'cardHolderName' },
                { icon: Hash, label: t({ en: 'RIB / IBAN', fr: 'RIB / IBAN', ar: 'RIB / IBAN' }), value: ribVal || t({ en: 'Not set', fr: 'Non défini', ar: 'غير محدد' }), editable: true, field: 'rib' },
            ];

            return (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex flex-col min-h-[100dvh] bg-white relative pb-24"
                >
                    <div className="pt-12 px-5 pb-4 bg-white sticky top-0 z-20 shadow-sm border-b border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setView('main')}
                                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5"
                            >
                                <ArrowLeft size={24} className="text-black" />
                            </button>
                            <h2 className="text-[20px] font-black">{t({ en: 'My information', fr: 'Mes informations', ar: 'معلوماتي' })}</h2>
                        </div>

                        {/* Profile Pic Modify Button */}
                        <label className="cursor-pointer relative group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoChange}
                                className="hidden"
                                disabled={isUploadingPhoto}
                            />
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 relative border-2 border-white shadow-sm transition-all group-hover:scale-105 active:scale-95">
                                    <img
                                        src={userAvatar || userData?.avatar || userData?.photoURL || "/Images/Vectors Illu/LbricolFaceOY.webp"}
                                        className={cn("w-full h-full object-cover", isUploadingPhoto && "opacity-50")}
                                        alt="Avatar"
                                    />
                                    {isUploadingPhoto && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-[#00A082] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Camera size={16} className="text-white" />
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-[#00A082] mt-1">{t({ en: 'Modify', fr: 'Modifier', ar: 'تعديل' })}</span>
                            </div>
                        </label>
                    </div>

                    <div className="px-5 space-y-2 mt-4">
                        {providerInfoItems.map((item, index) => {
                            const Icon = item.icon;
                            const isEditingThis = item.editable && editingField === item.field;

                            return (
                                <div key={index} className={`w-full ${index !== providerInfoItems.length - 1 ? 'border-b border-[#F0F0F0] pb-2 mb-2' : ''}`}>
                                    {isEditingThis ? (
                                        <div className="py-4 flex flex-col gap-3">
                                            <div className="flex items-center gap-5">
                                                <div className="w-6 flex justify-center">
                                                    <Icon size={24} className="text-[#00A082]" strokeWidth={1.5} />
                                                </div>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    placeholder={item.label}
                                                    className="flex-1 text-[17px] text-[#1D1D1D] font-medium leading-tight outline-none border-b-2 border-[#00A082] py-1"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => setEditingField('none')}
                                                    className="px-4 py-2 text-[14px] font-bold text-neutral-500"
                                                >
                                                    {t({ en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' })}
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={isSaving}
                                                    className="px-4 py-2 bg-[#00A082] text-white rounded-full text-[14px] font-bold disabled:opacity-50"
                                                >
                                                    {isSaving ? '...' : t({ en: 'Save', fr: 'Enregistrer', ar: 'حفظ' })}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="w-6 flex justify-center mt-1">
                                                    <Icon size={24} className="text-[#333333]" strokeWidth={1.2} />
                                                </div>
                                                <div className="flex flex-col flex-1">
                                                    <span className="text-[14px] text-neutral-500 font-medium mb-1">{item.label}</span>
                                                    <span className="text-[17px] text-[#1D1D1D] font-black break-all">{item.value}</span>
                                                </div>
                                            </div>
                                            {item.editable ? (
                                                <button
                                                    onClick={() => {
                                                        setEditingField(item.field as any);
                                                        setEditValue(item.value === t({ en: 'Not set', fr: 'Non défini', ar: 'غير محدد' }) ? '' : item.value);
                                                    }}
                                                    className="px-4 py-1.5 bg-neutral-100 rounded-full text-[13px] font-bold text-black"
                                                >
                                                    {t({ en: 'Edit', fr: 'Modifier', ar: 'تعديل' })}
                                                </button>
                                            ) : (
                                                <div className="px-3 py-1 bg-neutral-50 border border-neutral-100 rounded-md text-[11px] font-bold text-neutral-400">
                                                    {t({ en: 'Read Only', fr: 'Lecture seule', ar: 'قراءة فقط' })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            );
        }

        const infoItems = [
            { icon: User, label: displayName, hasChevron: true },
            { icon: Mail, label: userEmail || 'user@email.com', hasChevron: true },
            { icon: Lock, label: t({ en: 'Change password', fr: 'Changer le mot de passe', ar: 'تغيير كلمة المرور' }), hasChevron: true },
            { icon: Phone, label: t({ en: 'Change phone number', fr: 'Changer le numéro de téléphone', ar: 'تغيير رقم الهاتف' }), hasChevron: true },
            { icon: CreditCard, label: t({ en: 'Payment methods', fr: 'Moyens de paiement', ar: 'طرق الدفع' }), hasChevron: true },
            { icon: FileText, label: t({ en: 'Invoice information', fr: 'Informations de facturation', ar: 'معلومات الفاتورة' }), hasChevron: true },
            { icon: Megaphone, label: t({ en: 'Manage privacy', fr: 'Gérer la confidentialité', ar: 'إدارة الخصوصية' }), hasChevron: true },
        ];


        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col h-[100dvh] bg-[#FFFFFF] fixed inset-0 z-[1000]"
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
                                                {t({ en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' })}
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={isSaving}
                                                className="px-4 py-2 bg-[#00A082] text-white rounded-full text-[14px] font-bold disabled:opacity-50"
                                            >
                                                {isSaving ? '...' : t({ en: 'Save', fr: 'Enregistrer', ar: 'حفظ' })}
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
        const services = userData?.services || [];

        const groupedServices = services.reduce((acc: any[], s: any) => {
            const current = typeof s === 'string' ? { categoryId: s, isActive: true } : s;
            const categoryId = current.categoryId || current.serviceId || (typeof s === 'string' ? s : 'other');

            const existing = acc.find(g => g.categoryId === categoryId);
            const currentPhotos = current.portfolioImages || current.portfolio || current.images || current.portfolio_images || [];
            const isActive = current.isActive !== false;

            if (existing) {
                if (current.subServiceId && !existing.subServices.includes(current.subServiceId)) {
                    existing.subServices.push(current.subServiceId);
                    existing.subServiceNames.push(current.subServiceName || '');
                }
                existing.portfolioImages = [...new Set([...existing.portfolioImages, ...currentPhotos])];
                existing.equipments = [...new Set([...existing.equipments, ...(current.equipments || [])])];
            } else {
                acc.push({
                    categoryId: categoryId,
                    categoryName: t({ en: current.categoryName || getServiceName(categoryId) || '', fr: current.categoryName || getServiceName(categoryId) || '' }),
                    hourlyRate: current.hourlyRate,
                    experience: current.experience,
                    pitch: current.pitch || '',
                    noEquipment: current.noEquipment || false,
                    equipments: current.equipments || [],
                    portfolioImages: currentPhotos,
                    subServices: current.subServiceId ? [current.subServiceId] : [],
                    subServiceNames: current.subServiceName ? [current.subServiceName] : [],
                    isActive
                });
            }
            return acc;
        }, []);

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col h-[100dvh] bg-white relative overflow-hidden"
            >
                {/* Header */}
                <div className="pt-5 pb-5 bg-white sticky top-0 z-20 px-6">
                    <div className="flex items-center justify-between mb-8">
                        {initialView !== 'portfolio' ? (
                            <button
                                onClick={() => setView('main')}
                                className="w-10 h-5 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-50 transition-colors"
                            >
                                <ArrowLeft size={24} className="text-black" />
                            </button>
                        ) : <div />}
                    </div>
                    <h2 className="text-[32px] font-black text-[#1D1D1D] tracking-tighter leading-tight">
                        {t({ en: 'Work Portfolio', fr: 'Portfolio de réalisations', ar: 'معرض الأعمال' })}
                    </h2>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="px-6 space-y-0 pb-48">
                        {groupedServices.map((group: any, idx: number) => (
                            <div key={idx} className="block">
                                <motion.div
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setOnboardingMode('edit');
                                        setOnboardingInitialCat(group);
                                        setIsOnboardingOpen(true);
                                    }}
                                    className="w-full text-left py-12 space-y-6 cursor-pointer"
                                >
                                    {/* Service Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 flex items-center justify-center">
                                                <img
                                                    src={getServiceVector(group.categoryId)}
                                                    className={cn("w-full h-full object-contain transition-all", !group.isActive && "grayscale opacity-70")}
                                                    alt={group.categoryName}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className={cn("text-[30px] font-black tracking-tighter leading-none mb-1.5 transition-all text-[#1D1D1D]", !group.isActive && "text-neutral-400")}>
                                                    {t({ en: group.categoryName, fr: group.categoryName })}
                                                </h3>
                                                <span className={cn("text-[18px] font-bold transition-all text-neutral-600", !group.isActive && "text-neutral-300")}>
                                                    MAD {group.hourlyRate || '150'}/hr
                                                </span>
                                            </div>
                                        </div>

                                        <ChevronRight size={24} className="text-neutral-300" />
                                    </div>

                                    {/* Badges Layout */}
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2.5">
                                            {group.subServiceNames && group.subServiceNames.length > 0 && (
                                                <div className="px-4 py-1 bg-neutral-100 rounded-[8px] flex items-center border border-neutral-200/50">
                                                    <span className="text-[13px] font-bold text-neutral-600 whitespace-nowrap">
                                                        {group.subServiceNames.length} {t({ en: 'Subservices offered', fr: 'Sous-services offerts', ar: 'خدمات فرعية مقدمة' })}
                                                    </span>
                                                </div>
                                            )}
                                            {group.experience && (
                                                <div className="px-4 py-1 bg-neutral-100 rounded-[8px] flex items-center border border-neutral-200/50">
                                                    <span className="text-[13px] font-bold text-neutral-600 whitespace-nowrap">
                                                        {group.experience.toLowerCase().includes('year')
                                                            ? group.experience
                                                            : t({
                                                                en: `${group.experience} Years of experience`,
                                                                fr: `${group.experience} ans d’expérience`,
                                                                ar: `${group.experience} سنوات خبرة`
                                                            })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {group.equipments.length > 0 && (
                                            <div className="flex">
                                                <div className="px-4 py-1 bg-neutral-100 rounded-[8px] flex items-center border border-neutral-200/50">
                                                    <span className="text-[13px] font-bold text-neutral-600 whitespace-nowrap">
                                                        {group.equipments.length} {t({ en: 'Tools Used', fr: 'Outils utilisés', ar: 'أدوات مستخدمة' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Image Preview - Link Real Photos */}
                                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                                        {group.portfolioImages.length > 0 ? (
                                            group.portfolioImages.map((img: string, i: number) => (
                                                <div
                                                    key={i}
                                                    className="w-[110px] h-[85px] rounded-[14px] bg-neutral-50/50 border border-neutral-100/50 flex-shrink-0 flex items-center justify-center p-1"
                                                >
                                                    <img
                                                        src={img}
                                                        className="w-full h-full object-cover rounded-[10px]"
                                                        alt="Past work"
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            [1, 2, 3].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-[110px] h-[85px] rounded-[14px] bg-neutral-50/50 border border-neutral-100/50 flex-shrink-0 flex items-center justify-center p-3"
                                                >
                                                    <img
                                                        src={getServiceVector(group.categoryId)}
                                                        className="w-full h-full object-contain opacity-70 grayscale"
                                                        alt="Portfolio placeholder"
                                                    />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                                {idx < groupedServices.length - 1 && <hr className="border-[#0CB380]/10" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Add Button */}
                <div className="fixed bottom-[75px] left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-neutral-100 px-8 py-4 z-30">
                    <button
                        onClick={() => {
                            setOnboardingMode('add');
                            setOnboardingInitialCat(null);
                            setIsOnboardingOpen(true);
                        }}
                        className="w-full h-[52px] bg-[#0CB380] text-white rounded-full text-[20px] font-black active:scale-[0.98] transition-all"
                    >
                        {t({ en: 'Add Service', fr: 'Ajouter un service', ar: 'إضافة خدمة' })}
                    </button>
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
                        {t({ en: 'Admin Access', fr: 'Accès Admin', ar: 'دخول الإدارة' })}
                    </h2>
                    <p className="text-center text-neutral-500 mb-8 whitespace-pre-line">
                        {t({
                            en: 'Please enter the secret code\nto access the admin portal.',
                            fr: 'Veuillez saisir le code secret\npour accéder au portail admin.',
                            ar: 'يرجى إدخال الرمز السري\nللدخول إلى بوابة الإدارة.'
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
                            {t({ en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' })}
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
                            {isVerifying ? '...' : t({ en: 'Access', fr: 'Accéder', ar: 'دخول' })}
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
            {isOnboardingOpen && (
                <OnboardingPopup
                    isOpen={isOnboardingOpen}
                    onClose={() => setIsOnboardingOpen(false)}
                    mode={onboardingMode}
                    initialCategory={onboardingInitialCat}
                    userData={userData}
                    onComplete={() => {
                        // The popup already updates Firestore, but maybe we need to refresh local state?
                        // If userData follows Firebase, it might update automatically via a listener in the parent.
                        setIsOnboardingOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default ProfileView;
