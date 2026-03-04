"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface DataContextType {
    orders: any[]; // Client's orders
    loadingOrders: boolean;
    marketJobs: any[]; // Provider's available market jobs
    acceptedJobs: any[]; // Provider's confirmed jobs
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, userData, isBricoler } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [marketJobs, setMarketJobs] = useState<any[]>([]);
    const [acceptedJobs, setAcceptedJobs] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            setOrders([]);
            setMarketJobs([]);
            setAcceptedJobs([]);
            setLoadingOrders(false);
            return;
        }

        setLoadingOrders(true);

        // 1. Client's own orders
        const clientJobsQuery = query(collection(db, 'jobs'), where('clientId', '==', currentUser.uid));
        const unsubClient = onSnapshot(clientJobsQuery, (snapshot) => {
            const loaded = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setOrders(loaded);
            setLoadingOrders(false);
        });

        // 2. Provider's Market jobs (jobs in their city with 'open' or 'negotiating' status)
        let unsubMarket = () => { };
        if (isBricoler) {
            const city = userData?.city || '';
            const marketQuery = query(
                collection(db, 'jobs'),
                where('status', 'in', ['open', 'negotiating'])
            );
            unsubMarket = onSnapshot(marketQuery, (snapshot) => {
                const loaded = snapshot.docs
                    .map(doc => ({ ...doc.data(), id: doc.id }))
                    .filter((j: any) => !city || j.city === city);
                setMarketJobs(loaded);
            });
        }

        // 3. Provider's Accepted/Programmed jobs
        let unsubAccepted = () => { };
        if (isBricoler) {
            const acceptedQuery = query(
                collection(db, 'jobs'),
                where('bricolerId', '==', currentUser.uid)
            );
            unsubAccepted = onSnapshot(acceptedQuery, (snapshot) => {
                const loaded = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setAcceptedJobs(loaded);
            });
        }

        return () => {
            unsubClient();
            unsubMarket();
            unsubAccepted();
        };
    }, [currentUser, isBricoler, userData?.city]);


    return (
        <DataContext.Provider value={{ orders, loadingOrders, marketJobs, acceptedJobs }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
