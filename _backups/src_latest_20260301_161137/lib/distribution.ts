import { db } from './firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * ── Helper: Calculate total hours of availability defined in the Bricoler's calendar ──
 */
function calculateBricolerAvailabilityHours(calendarSlots: any): number {
    if (!calendarSlots || typeof calendarSlots !== 'object') return 0;
    let totalMinutes = 0;

    // Iterate through all dates in the calendarSlots record
    Object.values(calendarSlots).forEach((slots: any) => {
        if (Array.isArray(slots)) {
            slots.forEach(slot => {
                if (slot.from && slot.to) {
                    try {
                        const [h1, m1] = slot.from.split(':').map(Number);
                        const [h2, m2] = slot.to.split(':').map(Number);
                        const dur = (h2 * 60 + m2) - (h1 * 60 + m1);
                        if (dur > 0) totalMinutes += dur;
                    } catch (e) {
                        console.warn("[Distribution] Error parsing slot time:", slot);
                    }
                }
            });
        }
    });

    return totalMinutes / 60;
}
import { getServiceById } from '@/config/services_config';

export interface DistributionResult {
    providerIds: string[];
    debugInfo?: any;
}

/**
 * Job Distribution Algorithm
 * Matches a job with the best available providers.
 */
export async function distributeJob(jobData: {
    service: string;
    subService: string | null;
    city: string;
    date: string;
    time: string;
    clientId: string;
}): Promise<DistributionResult> {
    console.log("[Distribution] Starting for job:", jobData.service, jobData.city);

    try {
        // 1. Fetch all providers in the same city who are active
        // Extract base city name (e.g. "Casablanca (Inside)" -> "Casablanca")
        const baseCity = jobData.city.split(' (')[0];

        const providersQuery = query(
            collection(db, 'bricolers'),
            where('city', '>=', baseCity),
            where('city', '<=', baseCity + '\uf8ff')
        );

        const providersSnap = await getDocs(providersQuery);
        const candidates: any[] = [];

        const activeJobsQuery = query(
            collection(db, 'jobs'),
            where('city', '>=', baseCity),
            where('city', '<=', baseCity + '\uf8ff')
        );
        const activeJobsSnap = await getDocs(activeJobsQuery);
        const activeStatuses = ['new', 'negotiating', 'pending', 'waiting', 'accepted', 'confirmed', 'in_progress'];
        const activeJobs = activeJobsSnap.docs
            .map(doc => doc.data())
            .filter(j => activeStatuses.includes(j.status));

        // Use for...of to correctly handle async capacity checks
        for (const docSnap of providersSnap.docs) {
            const data = docSnap.data();

            const targetServiceId = getServiceById(jobData.service)?.id.toLowerCase() || jobData.service.toLowerCase();

            const serviceMatch = data.services?.find((s: any) => {
                const sId = (typeof s === 'string' ? s : s.serviceId).toLowerCase();
                return sId === targetServiceId;
            });

            if (!serviceMatch) continue;

            // If job has a subservice, check if provider is compatible
            if (jobData.subService) {
                // If service is a string, we assume they offer all sub-services for that category
                if (typeof serviceMatch === 'string') {
                    console.log(`[Distribution] Prov ${docSnap.id} matches via main service string (all subservices included)`);
                } else {
                    // If it's an object, it MUST explicitly contain the sub-service
                    const offersSubService = serviceMatch.subServices?.includes(jobData.subService);
                    if (!offersSubService) {
                        console.log(`[Distribution] Prov ${docSnap.id} does not offer subservice ${jobData.subService}`);
                        continue;
                    }
                }
            }

            // Filter active jobs relevant to this exact provider
            const providerJobs = activeJobs.filter(j =>
                j.bricolerId === docSnap.id || (j.offeredTo && j.offeredTo.includes(docSnap.id))
            );

            // 4. Collision Check: Already has a job at this exact time?
            const hasCollision = providerJobs.some(j => j.date === jobData.date && j.time === jobData.time);
            if (hasCollision) {
                console.log(`[Distribution] Prov ${docSnap.id} has a collision at ${jobData.date} ${jobData.time}`);
                continue;
            }

            // 5. Capacity Check (2 jobs/day max)
            const jobsOnDate = providerJobs.filter(j => j.date === jobData.date);
            if (jobsOnDate.length >= 2) {
                console.log(`[Distribution] Prov ${docSnap.id} is full for ${jobData.date}`);
                continue;
            }

            candidates.push({ id: docSnap.id, ...data });
        }

        console.log(`[Distribution] Found ${candidates.length} available candidates after filtering`);

        if (candidates.length === 0) {
            return { providerIds: [] };
        }

        // 6. Scoring Logic
        // Fetch client history for familiarity bonus
        let previousProviderIds: string[] = [];
        if (jobData.clientId) {
            const clientSnap = await getDoc(doc(db, 'clients', jobData.clientId));
            if (clientSnap.exists()) {
                previousProviderIds = clientSnap.data().previousProviders || [];
            }
        }

        const scoredCandidates = candidates.map(p => {
            let score = 0;

            // 1. Rating Factor (Max 50 points)
            const rating = p.rating || 5;
            score += rating * 10;

            // 2. Jobs Done Factor (Superiority for experience)
            const jobsCompleted = p.completedJobs || 0;
            // We reward 5 points per job, reflecting superiority for high-volume delivery
            score += jobsCompleted * 5;

            // 3. Availability Commitment Factor (Superiority for active providers)
            // Calculate total hours they have booked to declare availability
            const availabilityHours = calculateBricolerAvailabilityHours(p.calendarSlots);
            // We reward 1.5 points per hour of availability declared
            score += availabilityHours * 1.5;

            // Cold Start Bonus: If provider has < 5 jobs, give them a boost to help them get started
            // This remains but will naturally be outweighed by established "Elite" pros who 
            // have worked hundreds of hours and delivered many jobs.
            if (jobsCompleted < 5) {
                score += 15;
                console.log(`[Distribution] Prov ${p.id} given cold-start bonus`);
            }

            // Familiarity Bonus (20 points for repeat providers)
            if (previousProviderIds.includes(p.id)) {
                score += 20;
                console.log(`[Distribution] Prov ${p.id} given history bonus`);
            }

            return { id: p.id, score };
        });

        // 6. Sort and pick top 3
        scoredCandidates.sort((a, b) => b.score - a.score);
        const selectedIds = scoredCandidates.slice(0, 3).map(c => c.id);

        console.log("[Distribution] Selected providers:", selectedIds);

        return {
            providerIds: selectedIds,
            debugInfo: { candidatesCount: candidates.length, topScores: scoredCandidates.slice(0, 3) }
        };

    } catch (error) {
        console.error("[Distribution] Error:", error);
        return { providerIds: [] };
    }
}
