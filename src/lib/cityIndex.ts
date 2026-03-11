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
    quickPitch?: string;
    bio?: string;
    numReviews?: number;
    jobsDone?: number;
    errandsTransport?: string;
    movingTransport?: string;
    whatsappNumber?: string;
    matchScore: number;    // pre-baked for Firestore orderBy
    updatedAt: number;
}

/**
 * Computes a deterministic matchScore for a Bricoler.
 * Higher = better ranked in search results.
 *
 * Formula:
 *   rating (0–5) × 20          → max 100 pts
 *   completedJobs × 0.5        → unbounded, but practical ceiling ~50 pts for 100 jobs
 *   isVerified bonus            → +15 pts
 */
export const computeMatchScore = (
    rating: number,
    completedJobs: number,
    isVerified: boolean
): number => {
    const ratingScore = (rating || 0) * 20;
    const jobScore = Math.min((completedJobs || 0) * 0.5, 50); // cap at 50
    const verifiedBonus = isVerified ? 15 : 0;
    return Math.round(ratingScore + jobScore + verifiedBonus);
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
        displayName?: string;
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
        quickPitch?: string;
        bio?: string;
        numReviews?: number;
        jobsDone?: number;
        errandsTransport?: string;
        movingTransport?: string;
        whatsappNumber?: string;
    }
): Promise<void> => {
    if (!bricolerId || !city) return;

    const rating = data.rating || 0;
    const completedJobs = data.completedJobs || 0;
    const isVerified = data.isVerified || false;

    const entry: CityIndexEntry = {
        displayName: data.displayName || 'Bricoler',
        photoURL: data.profilePhotoURL || data.avatar || data.photoURL || null,
        rating,
        completedJobs,
        hourlyRate: data.hourlyRate || 75,
        isVerified,
        isActive: data.isActive !== false, // default true
        services: data.services || [],
        areas: data.areas || data.workAreas || [],
        workAreas: data.workAreas || data.areas || [],
        routine: data.routine || {},
        quickPitch: data.quickPitch,
        bio: data.bio,
        numReviews: data.numReviews || 0,
        jobsDone: data.jobsDone || data.completedJobs || 0,
        errandsTransport: data.errandsTransport,
        movingTransport: data.movingTransport,
        whatsappNumber: data.whatsappNumber,
        matchScore: computeMatchScore(rating, completedJobs, isVerified),
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
