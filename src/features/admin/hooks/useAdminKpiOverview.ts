import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { AdminStats } from '@/features/admin/hooks/useAdminDashboardStats';

export interface GlobalKpis extends AdminStats {
  activeCities: number;
  totalClients: number;
}

export interface CityKpis extends AdminStats {
  cityId: string;
  activeServices: number;
  totalProsDeclared: number;
  avgRating: number;
}

interface UseAdminKpiOverviewResult {
  loading: boolean;
  global: GlobalKpis;
  cities: CityKpis[];
}

const INITIAL_GLOBAL: GlobalKpis = {
  totalOrders: 0,
  totalGmv: 0,
  totalRevenue: 0,
  activeBricolers: 0,
  growthOrders: 0,
  growthGmv: 0,
  growthRevenue: 0,
  activeCities: 0,
  totalClients: 0,
};

export const useAdminKpiOverview = (providerId?: string): UseAdminKpiOverviewResult => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [bricolers, setBricolers] = useState<any[]>([]);
  const [cityDocs, setCityDocs] = useState<any[]>([]);
  const [clientsCount, setClientsCount] = useState(0);

  useEffect(() => {
    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      let filtered = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      if (providerId) {
        filtered = filtered.filter(j => j.bricolerId === providerId || j.acceptedId === providerId);
      }
      setJobs(filtered);
    });

    const unsubBricolers = onSnapshot(collection(db, 'bricolers'), (snapshot) => {
      let filtered = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      if (providerId) {
        filtered = filtered.filter(b => b.id === providerId);
      }
      setBricolers(filtered);
    });

    const unsubCities = onSnapshot(collection(db, 'city_services'), (snapshot) => {
      setCityDocs(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      if (providerId) {
        // For provider, we only count clients they've worked with
        const uniqueClients = new Set(jobs.map(j => j.clientId).filter(Boolean));
        setClientsCount(uniqueClients.size);
      } else {
        setClientsCount(snapshot.size);
      }
    });

    return () => {
      unsubJobs();
      unsubBricolers();
      unsubCities();
      unsubClients();
    };
  }, [providerId, jobs.length]); // jobs.length to re-calc unique clients if jobs change


  const [global, setGlobal] = useState<GlobalKpis>(INITIAL_GLOBAL);
  const [cities, setCities] = useState<CityKpis[]>([]);

  useEffect(() => {
    // Derive KPIs whenever source data changes
    const cityMap = new Map<string, CityKpis>();

    const ensureCity = (cityIdRaw: string | undefined): CityKpis => {
      const cityId = (cityIdRaw || 'Unknown').split(' (')[0];
      if (!cityMap.has(cityId)) {
        cityMap.set(cityId, {
          cityId,
          totalOrders: 0,
          totalGmv: 0,
          totalRevenue: 0,
          activeBricolers: 0,
          growthOrders: 0,
          growthGmv: 0,
          growthRevenue: 0,
          activeServices: 0,
          totalProsDeclared: 0,
          avgRating: 0,
        });
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cityMap.get(cityId)!;
    };

    // 1) Aggregate jobs
    let globalTotalOrders = 0;
    let globalGmv = 0;
    let globalRevenue = 0;

    jobs.forEach((job) => {
      const cityStats = ensureCity(job.city);
      globalTotalOrders += 1;
      cityStats.totalOrders += 1;

      const isCompleted = job.status === 'done' || job.status === 'completed';
      if (isCompleted) {
        const gmvVal =
          job.totalPrice !== undefined ? Number(job.totalPrice) : Number(job.price);
        const revenueVal = Number(job.serviceFee);
        const safeGmv = isNaN(gmvVal) ? 0 : gmvVal;
        const safeRev = isNaN(revenueVal) ? 0 : revenueVal;

        globalGmv += safeGmv;
        globalRevenue += safeRev;

        cityStats.totalGmv += safeGmv;
        cityStats.totalRevenue += safeRev;
      }
    });

    // 2) Aggregate bricolers
    let globalActiveBricolers = 0;
    const cityRatingAcc: Record<string, { sum: number; count: number }> = {};

    bricolers.forEach((b) => {
      const cityStats = ensureCity(b.city);
      const isActive = b.isActive !== false;
      if (isActive) {
        globalActiveBricolers += 1;
        cityStats.activeBricolers += 1;
      }
      if (typeof b.rating === 'number') {
        const cityId = cityStats.cityId;
        if (!cityRatingAcc[cityId]) {
          cityRatingAcc[cityId] = { sum: 0, count: 0 };
        }
        cityRatingAcc[cityId].sum += b.rating;
        cityRatingAcc[cityId].count += 1;
      }
    });

    // 3) Merge city_services info
    cityDocs.forEach((doc) => {
      const cityStats = ensureCity(doc.id);
      const activeServices = Array.isArray(doc.active_services) ? doc.active_services.length : 0;
      const totalProsDeclared =
        typeof doc.total_pros === 'number' ? doc.total_pros : cityStats.totalProsDeclared;

      cityStats.activeServices = activeServices;
      cityStats.totalProsDeclared = totalProsDeclared;
    });

    // 4) Compute average ratings per city
    Object.entries(cityRatingAcc).forEach(([cityId, acc]) => {
      const cityStats = ensureCity(cityId);
      if (acc.count > 0) {
        cityStats.avgRating = acc.sum / acc.count;
      }
    });

    // 5) Finalize collections
    const cityArray = Array.from(cityMap.values()).filter((c) => c.cityId !== 'Unknown');
    const activeCitiesCount = cityArray.filter(
      (c) =>
        c.totalOrders > 0 ||
        c.activeBricolers > 0 ||
        c.activeServices > 0 ||
        c.totalProsDeclared > 0,
    ).length;

    setCities(
      cityArray.sort((a, b) => {
        // Sort by GMV desc, then orders desc
        if (b.totalGmv !== a.totalGmv) return b.totalGmv - a.totalGmv;
        return b.totalOrders - a.totalOrders;
      }),
    );

    setGlobal({
      totalOrders: globalTotalOrders,
      totalGmv: globalGmv,
      totalRevenue: globalRevenue,
      activeBricolers: globalActiveBricolers,
      // Growth figures can be refined later using historic snapshots
      growthOrders: 0,
      growthGmv: 0,
      growthRevenue: 0,
      activeCities: activeCitiesCount,
      totalClients: clientsCount,
    });

    setLoading(false);
  }, [jobs, bricolers, cityDocs, clientsCount]);

  return { loading, global, cities };
};

