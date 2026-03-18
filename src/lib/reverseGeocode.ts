export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr,ar,en`,
      { headers: { 'User-Agent': 'Lbricol/1.0' } }
    );
    const data = await res.json();
    if (!data || data.error) return `${lat.toFixed(3)}, ${lng.toFixed(3)}, Morocco`;
    
    const a = data.address;
    const street = a.road || a.pedestrian || a.street || '';
    const number = a.house_number || '';
    const neighborhood = a.neighbourhood || a.suburb || '';
    const city = a.city || a.town || a.village || '';
    
    if (street) return number ? `${street}, ${number}, ${city}` : `${street}, ${city}`;
    if (neighborhood) return `${neighborhood}, ${city}, Morocco`;
    return `${city}, Morocco`;
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}, Morocco`;
  }
}
export async function searchAddress(query: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&accept-language=fr,ar,en&countrycodes=ma`,
      { headers: { 'User-Agent': 'Lbricol/1.0' } }
    );
    const data = await res.json();
    return data || [];
  } catch {
    return [];
  }
}
