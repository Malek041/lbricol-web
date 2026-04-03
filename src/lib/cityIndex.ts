/**
 * cityIndex.ts
 *
 * Maintains a lightweight, denormalized Firestore collection:
 *   city_index/{city}/providers/{bricolerId}
 *
 * This is the "search index" for Bricoler matching. It contains only the
 * fields needed for the order flow — NOT the full profile. The full
 * bricolers/{uid} document is fetched only when a specific Bricoler is selected.
 *
 * Writes happen whenever a Bricoler's key fields change:
 *   - Profile save
 *   - Onboarding completion
 *   - Job completion (completedJobs count updates)
 */

import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface CityIndexEntry {
    displayName: string;
    photoURL: string | null;
    rating: number;
    completedJobs: number;
    hourlyRate: number;
    isVerified: boolean;
    isActive: boolean;
    services: any[];       // same shape as bricolers/{uid}.services
    areas: string[];
    workAreas?: string[];
    routine?: Record<string, { active: boolean; from: string; to: string }>;
    quickPitch?: string | null;
    bio?: string | null;
    bio_translations?: { en?: string; fr?: string; ar?: string };
    numReviews?: number;
    jobsDone?: number;
    errandsTransport?: string | null;
    movingTransport?: string | null;
    movingTransports?: string[];
    whatsappNumber?: string | null;
    serviceIds?: string[];      // Flat array of category IDs for future Firestore filtering
    subServiceIds?: string[];   // Flat array of subservice IDs
    badge: string;
    matchScore: number;    // pre-baked for Firestore orderBy
    updatedAt: number;
}

import { 
  ratingScore, 
  jobsScore, 
  BADGE_SCORES, 
  experienceScore 
} from './matchBricolers';

/**
 * Computes a deterministic matchScore for a Bricoler (Static part only).
 * This score is used for pre-baking in Firestore and does NOT include distance.
 */
export const computeStaticMatchScore = (
    rating: number,
    numReviews: number,
    completedJobs: number,
    badge: string,
    experience: string
): number => {
    const rScore = ratingScore(rating, numReviews) * 0.25;
    const jScore = jobsScore(completedJobs) * 0.20;
    const bScore = (BADGE_SCORES[badge?.toLowerCase()] ?? 25) * 0.15;
    const eScore = experienceScore(experience) * 0.10;
    
    return Math.round(rScore + jScore + bScore + eScore);
};

/**
 * Writes (or updates) a Bricoler's entry in city_index.
 * Safe to call on every profile save — uses setDoc with merge.
 *
 * @param bricolerId - The Bricoler's Firebase UID
 * @param city       - The city the Bricoler operates in (e.g., "Essaouira")
 * @param data       - Partial Bricoler profile data
 */
export const writeCityIndex = async (
    bricolerId: string,
    city: string,
    data: {
        displayName?: string | null;
        profilePhotoURL?: string | null;
        avatar?: string | null;
        photoURL?: string | null;
        rating?: number;
        completedJobs?: number;
        hourlyRate?: number;
        isVerified?: boolean;
        isActive?: boolean;
        services?: any[];
        areas?: string[];
        workAreas?: string[];
        routine?: Record<string, { active: boolean; from: string; to: string }>;
        quickPitch?: string | null;
        bio?: string | null;
        bio_translations?: { en?: string; fr?: string; ar?: string };
        numReviews?: number;
        name?: string | null;
        jobsDone?: number;
        errandsTransport?: string | null;
        movingTransport?: string | null;
        movingTransports?: string[];
        whatsappNumber?: string | null;
        [key: string]: any;
    }
): Promise<void> => {
    if (!bricolerId || !city) return;

    const rating = data.rating || 0;
    const completedJobs = data.completedJobs || 0;
    const isVerified = data.isVerified || false;

    const services = data.services || [];
    const serviceIds = [...new Set(services.map((s: any) =>
        (typeof s === 'string' ? s : (s.categoryId || s.serviceId || s.id || '')).toLowerCase()
    ).filter(Boolean))];

    const subServiceIds = [...new Set(services.map((s: any) => {
        if (typeof s === 'string') return [];
        const ssId = s.subServiceId || '';
        const ssList = Array.isArray(s.subServices) ? s.subServices : [];
        return [ssId, ...ssList];
    }).flat().map(id => String(id).toLowerCase()).filter(Boolean))];

    const entry: CityIndexEntry = {
        displayName: data.displayName || data.name || 'Bricoler',
        photoURL: data.profilePhotoURL || data.avatar || data.photoURL || null,
        rating,
        completedJobs,
        hourlyRate: data.hourlyRate || 75,
        isVerified,
        isActive: data.isActive !== false, // default true
        services,
        serviceIds,
        subServiceIds,
        areas: data.areas || data.workAreas || [],
        workAreas: data.workAreas || data.areas || [],
        routine: data.routine || {},
        quickPitch: data.quickPitch,
        bio: data.bio,
        bio_translations: data.bio_translations || {},
        numReviews: data.numReviews || 0,
        jobsDone: data.jobsDone || data.completedJobs || 0,
        errandsTransport: data.errandsTransport,
        movingTransport: data.movingTransport,
        movingTransports: data.movingTransports || [],
        whatsappNumber: data.whatsappNumber,
        badge: data.badge || (data.isVerified ? 'pro' : 'new'),
        matchScore: computeStaticMatchScore(
            rating, 
            data.numReviews || 0, 
            completedJobs, 
            data.badge || (data.isVerified ? 'pro' : 'new'),
            data.experience || ''
        ),
        updatedAt: Date.now(),
    };

    try {
        const indexRef = doc(db, 'city_index', city, 'providers', bricolerId);
        await setDoc(indexRef, entry, { merge: true });
    } catch (err) {
        // Non-fatal: if index write fails, the search just falls back to scanning
        console.warn('[cityIndex] Failed to write index entry:', err);
    }
};
