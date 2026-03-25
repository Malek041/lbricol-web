export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const straightLine = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(straightLine * 1.25 * 10) / 10; // road estimate, 1 decimal
}

export async function getRoadDistance(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): Promise<{ distanceKm: number; durationMinutes: number }> {
  try {
    // Switch to OSRM (free, no key needed, consistent with MapView)
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=false`
    );

    if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route found');

    const route = data.routes[0];
    const durationMin = Math.round(route.duration / 60);

    return {
      distanceKm: Number((route.distance / 1000).toFixed(1)),
      durationMinutes: Math.max(1, durationMin), // Minimum 1 minute
    };
  } catch (error) {
    console.warn('Road distance calculation failed, using fallback:', error);
    const straight = calculateDistance(fromLat, fromLng, toLat, toLng);
    return {
      distanceKm: straight,
      durationMinutes: Math.max(1, Math.round(straight * 3)), // rough estimate: 3 min per km
    };
  }
}

