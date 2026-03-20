import { calculateDistance } from './calculateDistance';

/**
 * Weighted Composite Score Algorithm for Bricoler Matching
 */

const PLATFORM_AVG = 4.0;
const MIN_REVIEWS = 10;

export const BADGE_SCORES: Record<string, number> = {
  elite: 100,
  pro: 75,
  classic: 50,
  new: 25,
};

export function distanceScore(km: number): number {
  if (km <= 2) return 100;
  if (km <= 5) return 85;
  if (km <= 10) return 65;
  if (km <= 15) return 40;
  if (km <= 20) return 20;
  return 0;
}

export function ratingScore(rating: number, numReviews: number): number {
  const adjusted = (numReviews * (rating || 0) + MIN_REVIEWS * PLATFORM_AVG) 
                   / (numReviews + MIN_REVIEWS);
  return (adjusted / 5) * 100;
}

export function jobsScore(jobs: number): number {
  if (jobs >= 100) return 100;
  if (jobs >= 50) return 85;
  if (jobs >= 20) return 70;
  if (jobs >= 10) return 55;
  if (jobs >= 5) return 40;
  if (jobs >= 1) return 25;
  return 15;
}

export function experienceScore(years: string): number {
  if (years?.includes('10+')) return 100;
  if (years?.includes('5-10')) return 80;
  if (years?.includes('3-5')) return 60;
  if (years?.includes('1-3')) return 40;
  return 20;
}

/**
 * matchScore computes the ranking score for a Bricoler.
 */
export function matchScore(
  bricoler: any,
  clientLat: number,
  clientLng: number,
  serviceType: string
): number {
  const lat = bricoler.base_lat;
  const lng = bricoler.base_lng;

  if (!lat || !lng) return 15;

  const dist = calculateDistance(clientLat, clientLng, lat, lng);
  if (dist > 20) return -1; // Flag for hard exclusion

  const service = bricoler.services?.find((s: any) => s.categoryId === serviceType);
  const experienceStr = service?.experience || bricoler.experience || "";

  const baseScore =
    distanceScore(dist)                                      * 0.30 +
    ratingScore(bricoler.rating || 0, bricoler.numReviews || 0) * 0.25 +
    jobsScore(bricoler.completedJobs || 0)                      * 0.20 +
    (BADGE_SCORES[(bricoler.badge || 'new').toLowerCase()] ?? 25) * 0.15 +
    experienceScore(experienceStr)                              * 0.10;

  let finalScore = baseScore;
  if (bricoler.availableToday === true) {
    finalScore += 8;
  }

  return finalScore;
}

/**
 * applyNewBricolerProtection and sorting
 */
export function sortBricolers(
  bricolers: any[],
  clientLat: number,
  clientLng: number,
  serviceType: string
): any[] {
  const scored = bricolers
    .map(b => ({
      ...b,
      matchScore: matchScore(b, clientLat, clientLng, serviceType)
    }))
    .filter(b => b.matchScore >= 0);

  scored.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  const zeroJobBricolers = scored.filter(b => (b.completedJobs || 0) === 0);
  const establishedBricolers = scored.filter(b => (b.completedJobs || 0) > 0);

  if (zeroJobBricolers.length === 0) return establishedBricolers;
  
  const bottomThirdStart = Math.floor(establishedBricolers.length * 2 / 3);
  const topTwoThirds = establishedBricolers.slice(0, bottomThirdStart);
  const bottomThird = establishedBricolers.slice(bottomThirdStart);

  return [...topTwoThirds, ...zeroJobBricolers, ...bottomThird];
}
