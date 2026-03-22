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
    const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
    if (!apiKey) throw new Error('ORS API key not set');

    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car` +
      `?api_key=${apiKey}` +
      `&start=${fromLng},${fromLat}` +
      `&end=${toLng},${toLat}`
    );

    if (!res.ok) throw new Error(`ORS error: ${res.status}`);

    const data = await res.json();
    const segment = data.features?.[0]?.properties?.segments?.[0];
    if (!segment) throw new Error('No route found');

    return {
      distanceKm: Math.round(segment.distance / 100) / 10,
      durationMinutes: Math.round(segment.duration / 60),
    };
  } catch (error) {
    console.warn('Road distance calculation failed, using fallback:', error);
    // Fallback to haversine estimate if API fails or key missing
    const straight = calculateDistance(fromLat, fromLng, toLat, toLng);
    return {
      distanceKm: straight,
      durationMinutes: Math.round(straight * 3), // rough estimate: 3 min per km
    };
  }
}

