import React from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

interface MapDisplayProps {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}

export default function MapDisplay({ pickupLat, pickupLng, dropoffLat, dropoffLng }: MapDisplayProps) {
  return (
    <div style={{ 
      height: 180, 
      width: '100%', 
      borderRadius: '24px', 
      overflow: 'hidden', 
      marginBottom: 24,
      border: '1px solid #F3F4F6',
      background: '#F9FAFB'
    }}>
      <MapView 
        initialLocation={{ lat: pickupLat, lng: pickupLng }}
        interactive={false}
        onLocationChange={() => {}}
        providerPins={[{
          id: 'destination',
          lat: dropoffLat,
          lng: dropoffLng,
          rate: 0,
          rating: 5,
          taskCount: 0,
          isSelected: true
        }]}
        focusedProviderId="destination"
        zoom={14}
        pinY={50}
        showCenterPin={false}
        clientPin={{ lat: pickupLat, lng: pickupLng }}
      />
    </div>
  );
}
