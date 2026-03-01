import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export interface AdminStats {
  totalOrders: number;
  totalGmv: number;
  totalRevenue: number;
  activeBricolers: number;
  growthOrders: number;
  growthGmv: number;
  growthRevenue: number;
}

const INITIAL_STATS: AdminStats = {
  totalOrders: 0,
  totalGmv: 0,
  totalRevenue: 0,
  activeBricolers: 0,
  // Keep current mocked growth values as defaults
  growthOrders: 12.5,
  growthGmv: 15.2,
  growthRevenue: 8.2,
};

export const useAdminDashboardStats = (selectedCity: string) => {
  const [stats, setStats] = useState<AdminStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    let ordersQuery = query(collection(db, 'jobs'));
    if (selectedCity !== 'all') {
      ordersQuery = query(collection(db, 'jobs'), where('city', '==', selectedCity));
    }

    let bricolersQuery = query(collection(db, 'bricolers'));
    if (selectedCity !== 'all') {
      bricolersQuery = query(collection(db, 'bricolers'), where('city', '==', selectedCity));
    }

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = snapshot.docs.map((doc) => doc.data() as any);
      const totalOrders = ordersData.length;

      const completedOrders = ordersData.filter(
        (order) => order.status === 'done' || order.status === 'completed',
      );

      const totalGmv = completedOrders.reduce((acc, order) => {
        const val =
          order.totalPrice !== undefined ? Number(order.totalPrice) : Number(order.price);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      const totalRevenue = completedOrders.reduce((acc, order) => {
        const val = Number(order.serviceFee);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      setStats((prev) => ({
        ...prev,
        totalOrders,
        totalGmv,
        totalRevenue,
      }));
      setLoading(false);
    });

    const unsubBricolers = onSnapshot(bricolersQuery, (snapshot) => {
      setStats((prev) => ({
        ...prev,
        activeBricolers: snapshot.docs.length,
      }));
    });

    return () => {
      unsubOrders();
      unsubBricolers();
    };
  }, [selectedCity]);

  return { stats, loading };
};

