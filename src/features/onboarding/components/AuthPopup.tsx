"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import { fluidMobilePx, useIsMobileViewport, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';
import { auth, db } from '@/lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithRedirect, getRedirectResult, browserPopupRedirectResolver } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (u?: any) => void;
}

const AuthPopup = ({ isOpen, onClose, onSuccess }: AuthPopupProps) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showWhatsAppRequest, setShowWhatsAppRequest] = React.useState(false);
    const [whatsapp, setWhatsapp] = React.useState('');
    const [tempUser, setTempUser] = React.useState<any>(null);
    const isMobile = useIsMobileViewport(968);
    const mobileTier = useMobileTier();
    const viewportWidth = useViewportWidth();
    const isCompactPhone = isMobile && mobileTier === 'compact';

    const headerPadding = `${Math.round(fluidMobilePx(viewportWidth, 16, 20))}px`;
    const contentPaddingX = `${Math.round(fluidMobilePx(viewportWidth, 20, 32))}px`;
    const contentPaddingTop = `${Math.round(fluidMobilePx(viewportWidth, 24, 40))}px`;
    const titleSize = `${Math.round(fluidMobilePx(viewportWidth, 26, 32))}px`;
    const subtitleSize = `${Math.round(fluidMobilePx(viewportWidth, 15, 17))}px`;
    const primaryButtonFont = `${Math.round(fluidMobilePx(viewportWidth, 16, 18))}px`;
    const primaryButtonPaddingY = `${Math.round(fluidMobilePx(viewportWidth, 14, 18))}px`;
    const footerPadding = `${Math.round(fluidMobilePx(viewportWidth, 20, 32))}px`;
    const [authChecked, setAuthChecked] = React.useState(false);

    // Handle Redirect Result and existing users
    React.useEffect(() => {
        if (!isOpen) return;

        const checkAuth = async () => {
            try {
                // If we're returning from a redirect
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    await handleAuthSuccess(result.user);
                    return;
                }

                // Normal check for already being logged in
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await handleAuthSuccess(currentUser);
                }
            } catch (err) {
                console.error("Redirect check error:", err);
            } finally {
                setAuthChecked(true);
            }
        };

        checkAuth();
    }, [isOpen, authChecked]);

    const handleAuthSuccess = async (user: any) => {
        const userRef = doc(db, 'users', user.uid);
        const clientRef = doc(db, 'clients', user.uid);
        const [userSnap, clientSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(clientRef)
        ]);

        const hasWhatsApp = userSnap.data()?.whatsappNumber || clientSnap.data()?.whatsappNumber;

        if (!hasWhatsApp) {
            setTempUser(user);
            setShowWhatsAppRequest(true);
        } else {
            onSuccess(user);
        }
    };

    const handleAuth = async () => {
        if (isLoading) return;
        
        try {
            const provider = new GoogleAuthProvider();
            // Important: Call signInWithPopup as the absolute first async thing in the handler
            // to maximize chances of browser allowing the popup.
            let result;
            try {
                result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
                if (result.user) {
                    setIsLoading(true); // Only show loading after popup is out
                    await handleAuthSuccess(result.user);
                }
            } catch (popupError: any) {
                console.warn("Popup blocked or closed:", popupError.code);
                if (popupError.code === 'auth/popup-blocked' || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    setIsLoading(true);
                    await signInWithRedirect(auth, provider);
                } else if (popupError.code !== 'auth/popup-closed-by-user') {
                    throw popupError;
                }
            }
        } catch (error: any) {
            console.error("Auth error:", error);
            alert("Sign-in failed. Please try again or check your browser settings.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleWhatsAppSubmit = async () => {
        if (!tempUser || whatsapp.length < 9) return;
        setIsLoading(true);
        try {
            const userRef = doc(db, 'users', tempUser.uid);
            const clientRef = doc(db, 'clients', tempUser.uid);

            const data = {
                uid: tempUser.uid,
                email: tempUser.email,
                displayName: tempUser.displayName,
                photoURL: tempUser.photoURL,
                role: 'client',
                userType: 'client',
                whatsappNumber: whatsapp,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            await Promise.all([
                setDoc(userRef, data, { merge: true }),
                setDoc(clientRef, data, { merge: true })
            ]);

            onSuccess(tempUser);
        } catch (error) {
            console.error("WhatsApp save error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 4000,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: headerPadding, display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                marginLeft: '-8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ArrowLeft size={isCompactPhone ? 24 : 28} color="#1D1D1D" />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: `0 ${contentPaddingX}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '-10vh' }}>
                        <AnimatePresence mode="wait">
                            {!showWhatsAppRequest ? (
                                <motion.div
                                    key="google-stage"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                >
                                    {/* Logo */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <Image
                                            src="/Images/Logo/LbricolPinLogoYG.png"
                                            alt="Lbricol"
                                            width={160}
                                            height={160}
                                            style={{ objectFit: 'contain' }}
                                        />
                                    </div>

                                    <p style={{
                                        fontSize: '18px',
                                        color: '#4B5563',
                                        fontWeight: 500,
                                        textAlign: 'center',
                                        marginBottom: '48px',
                                    }}>
                                        {t({
                                            en: 'Log in or Sign up',
                                            fr: 'Se connecter ou s\'inscrire',
                                            ar: 'تسجيل الدخول أو الاشتراك'
                                        })}
                                    </p>

                                    {/* Google Button */}
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={handleAuth}
                                        disabled={isLoading}
                                        style={{
                                            width: '100%',
                                            maxWidth: '320px',
                                            padding: '16px 24px',
                                            borderRadius: '100px',
                                            border: '1px solid #E5E7EB',
                                            backgroundColor: '#FFFFFF',
                                            color: '#111827',
                                            fontSize: '17px',
                                            fontWeight: 500,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '14px',
                                            cursor: isLoading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isLoading ? (
                                            <div className="w-6 h-6 border-3 border-gray-200 border-t-[#01A083] rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <FcGoogle size={24} />
                                                Google
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="whatsapp-stage"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}
                                >
                                    <div style={{ width: 64, height: 64, background: '#07B31D', borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#fff' }}>
                                        <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.519.074-.791.371c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                    </div>
                                    <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px', color: '#111827' }}>Final Step</h2>
                                    <p style={{ fontSize: '16px', color: '#6B7280', marginBottom: '32px', lineHeight: 1.5 }}>
                                        Enter your WhatsApp to proceed.
                                    </p>

                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{ padding: '20px 20px', background: '#F3F4F6', borderRadius: '15px', fontWeight: 900, fontSize: '17px', color: '#4B5563' }}>+212</div>
                                        <input
                                            type="tel"
                                            value={whatsapp}
                                            onChange={(e) => {
                                                let v = e.target.value.replace(/\D/g, '');
                                                if (v.startsWith('212')) v = v.slice(3);
                                                if (v.startsWith('0')) v = v.slice(1);
                                                setWhatsapp(v.slice(0, 9));
                                            }}
                                            placeholder="6 00 00 00 00"
                                            style={{ flex: 1, minWidth: 0, padding: '16px 24px', borderRadius: '15px', border: '2px solid #E5E7EB', outline: 'none', fontSize: '18px', fontWeight: 400, transition: 'all 0.2s' }}
                                        />
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 700, marginBottom: '50px' }}></p>

                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={handleWhatsAppSubmit}
                                        disabled={isLoading || whatsapp.length < 9}
                                        style={{
                                            width: '100%',
                                            padding: '18px',
                                            borderRadius: '50px',
                                            background: (isLoading || whatsapp.length < 9) ? '#E5E7EB' : '#01A083',
                                            color: '#fff',
                                            fontSize: '18px',
                                            fontWeight: 900,
                                            border: 'none',
                                            cursor: (isLoading || whatsapp.length < 9) ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isLoading ? 'Saving...' : 'Complete & Continue'}
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer Policy */}
                    <div style={{ padding: footerPadding, textAlign: 'center' }}>
                        <p style={{
                            fontSize: isCompactPhone ? '12px' : '13px',
                            color: '#B3B3B3',
                            lineHeight: 1.6,
                        }}>
                            {t({
                                en: "By continuing, you agree to Lbricol's Terms and ",
                                fr: "En continuant, vous acceptez les CGU de Lbricol et notre ",
                                ar: "من خلال المتابعة، فإنك توافق على شروط خدمة Lbricol و "
                            })}
                            <a
                                href="/privacy"
                                style={{
                                    color: '#01A083',
                                    textDecoration: 'none',
                                    fontWeight: 700,
                                    marginLeft: '2px'
                                }}
                            >
                                {t({
                                    en: "Privacy Policy.",
                                    fr: "Politique de confidentialité.",
                                    ar: "سياسة الخصوصية الخاصة بنا."
                                })}
                            </a>
                        </p>
                    </div>

                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthPopup;
