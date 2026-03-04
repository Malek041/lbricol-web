"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

interface AuthContextType {
    currentUser: FirebaseUser | null;
    userData: any | null;
    isAdmin: boolean;
    isBricoler: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isBricoler, setIsBricoler] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserData: (() => void) | null = null;
        let unsubscribeBricolerStatus: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (unsubscribeUserData) { unsubscribeUserData(); unsubscribeUserData = null; }
            if (unsubscribeBricolerStatus) { unsubscribeBricolerStatus(); unsubscribeBricolerStatus = null; }

            setCurrentUser(user);

            if (user) {
                // Real-time User Data
                const userRef = doc(db, 'users', user.uid);
                unsubscribeUserData = onSnapshot(userRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setUserData(data);
                        setIsAdmin(data.role === 'admin');
                    } else {
                        const newUser = {
                            uid: user.uid,
                            name: user.displayName,
                            email: user.email,
                            createdAt: serverTimestamp()
                        };
                        setDoc(userRef, newUser, { merge: true }).catch(console.error);
                    }
                });

                // Real-time Bricoler Status
                const bricolerRef = doc(db, 'bricolers', user.uid);
                unsubscribeBricolerStatus = onSnapshot(bricolerRef, (snap) => {
                    setIsBricoler(snap.exists());
                });
            } else {
                setUserData(null);
                setIsAdmin(false);
                setIsBricoler(false);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserData) unsubscribeUserData();
            if (unsubscribeBricolerStatus) unsubscribeBricolerStatus();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, userData, isAdmin, isBricoler, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
