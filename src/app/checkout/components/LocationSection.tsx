import React from 'react';
import LocationInput from './LocationInput';
import { MapPin } from 'lucide-react';

interface LocationSectionProps {
  pickupLocation: { address: string; lat: number | null; lng: number | null };
  dropoffLocation: { address: string; lat: number | null; lng: number | null };
  searchResults: { pickup: any[]; dropoff: any[] };
  onSearch: (query: string, type: 'pickup' | 'dropoff') => void;
  onSelectPickup: (location: any) => void;
  onSelectDropoff: (location: any) => void;
  errors: Record<string, string>;
}

export default function LocationSection({
  pickupLocation,
  dropoffLocation,
  searchResults,
  onSearch,
  onSelectPickup,
  onSelectDropoff,
  errors
}: LocationSectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 16 }}>Delivery details</h2>
      
      <div style={{ position: 'relative' }}>
        <LocationInput
          label="Where from?"
          icon={<MapPin size={20} color="#219178" />}
          value={pickupLocation.address}
          results={searchResults.pickup}
          onSearch={(q) => onSearch(q, 'pickup')}
          onSelect={onSelectPickup}
          error={errors.pickup || errors.pickupCoords}
          placeholder="Building name, street, city..."
        />

        <div style={{
          position: 'absolute',
          left: 26,
          top: 50,
          bottom: 50,
          width: 2,
          borderLeft: '2px dashed #E5E7EB',
          zIndex: 0
        }} />

        <LocationInput
          label="Where to?"
          icon={<MapPin size={20} color="#EF4444" />}
          value={dropoffLocation.address}
          results={searchResults.dropoff}
          onSearch={(q) => onSearch(q, 'dropoff')}
          onSelect={onSelectDropoff}
          error={errors.dropoff || errors.dropoffCoords}
          placeholder="Destination address..."
        />
      </div>
    </div>
  );
}
