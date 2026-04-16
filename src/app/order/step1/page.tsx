'use client';
import { safeStorage } from '@/lib/safeStorage';
import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { SavedAddress } from '@/components/location-picker/types';
import LocationPicker from '@/components/location-picker/LocationPicker';

function Step1Content() {
  const router = useRouter();
  const { order, setOrderField } = useOrder();
  const [userSavedAddresses, setUserSavedAddresses] = useState<SavedAddress[]>([]);

  useEffect(() => {
    // Load saved addresses from localStorage
    const saved = safeStorage.getItem('lbricol_saved_addresses');
    if (saved) {
      try {
        setUserSavedAddresses(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved addresses", e);
      }
    }
  }, []);

  const handleConfirm = (result: { pickup: any, savedAddress?: SavedAddress }) => {
    const { pickup, savedAddress } = result;
    
    // Extract location details
    const currentLat = pickup.lat;
    const currentLng = pickup.lng;
    const currentAddress = pickup.address;
    
    // Optional: Extract city/area if not already in pickup (LocationPoint usually has them if reverse geocoded)
    const currentCity = pickup.city || '';
    const currentArea = pickup.area || '';

    // Persist to localStorage for Home page consistency
    if (currentCity) safeStorage.setItem('lbricol_preferred_city', currentCity);
    if (currentArea) safeStorage.setItem('lbricol_preferred_area', currentArea);
    safeStorage.setItem('lastKnownLat', currentLat.toString());
    safeStorage.setItem('lastKnownLng', currentLng.toString());
    safeStorage.setItem('lastKnownAddress', currentAddress);

    // Update Order Context
    const locData = {
      lat: currentLat,
      lng: currentLng,
      address: currentAddress,
      city: currentCity,
      area: currentArea,
      ...savedAddress
    };

    setOrderField('location', locData);
    setOrderField('discoveryLocation', locData);

    // Move to next step
    const isBroadcast = order.serviceType === 'errands' || order.serviceType === 'courier';
    if (isBroadcast) {
      setOrderField('isPublic', true);
      router.push('/order/setup');
    } else {
      router.push('/order/step2');
    }
  };

  const handleSaveAddress = (addr: SavedAddress) => {
    setUserSavedAddresses(prev => {
      const exists = prev.find(a => a.id === addr.id);
      const newList = exists ? prev.map(a => a.id === addr.id ? addr : a) : [addr, ...prev];
      safeStorage.setItem('lbricol_saved_addresses', JSON.stringify(newList));
      return newList;
    });
  };

  const handleDeleteAddress = (id: string) => {
    setUserSavedAddresses(prev => {
      const newList = prev.filter(a => a.id !== id);
      safeStorage.setItem('lbricol_saved_addresses', JSON.stringify(newList));
      return newList;
    });
  };

  return (
    <div className="fixed inset-0 z-[6000] bg-white">
      <LocationPicker
        mode="single"
        serviceType="general"
        onConfirm={handleConfirm}
        onClose={() => router.back()}
        savedAddresses={userSavedAddresses}
        autoLocate={true}
        onSaveAddress={handleSaveAddress}
        onDeleteAddress={handleDeleteAddress}
      />
    </div>
  );
}

export default function Step1Page() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-[#01A083] border-t-transparent rounded-full animate-spin"></div></div>}>
      <Step1Content />
    </Suspense>
  );
}