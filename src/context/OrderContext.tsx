'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  area?: string;
}

export interface ServiceDetails {
  rooms?: number;
  taskDuration?: number;
  propertyType?: string;
  tvCount?: number;
  mountTypes?: string[];
  wallMaterial?: string;
  liftingHelp?: string;
  mountingAddOns?: string[];
  pickupCoords?: any;
  dropoffCoords?: any;
  deliveryDistanceKm?: number;
  deliveryDurationMinutes?: number;
  taskSize?: 'small' | 'medium' | 'large';
  needsTransport?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  deliveryType?: 'standard' | 'schedule';
  deliveryDate?: string;
  deliveryTime?: string;
  note?: string;
  itemDescription?: string;
  officeDesks?: number;
  officeMeetingRooms?: number;
  officeBathrooms?: number;
  hasKitchenette?: boolean;
  hasReception?: boolean;
  officeAddOns?: string[];
  windowCount?: number;
  windowSize?: 'small' | 'medium' | 'large';
  buildingStories?: number;
  glassCleaningType?: 'interior' | 'exterior' | 'both';
  glassAccessibility?: 'easy' | 'ladder';
  storeFrontSize?: 'small' | 'medium' | 'large';
  gardenSize?: 'small' | 'medium' | 'large' | 'estate';
  lawnCondition?: 'standard' | 'wild' | 'overgrown';
  needsMower?: boolean;
  treeCount?: number;
  treeHeight?: 'small' | 'medium' | 'large' | 'giant';
  trimmingType?: 'shaping' | 'thinning' | 'deadwood' | 'removal';
  includeWasteRemoval?: boolean;
  unitCount?: number;
  stairsType?: 'small' | 'medium' | 'large' | 'none';
  tipAmount?: number;
  photoUrls?: string[];
  [key: string]: any;
}

interface OrderState {
  serviceType: string;
  serviceName: string;
  subServiceId: string;
  subServiceName: string;
  location: LocationPoint | null;
  discoveryLocation: LocationPoint | null;
  providerId: string | null;
  providerName: string | null;
  providerRate: number | null;
  providerAvatar?: string | null;
  providerRating?: number | null;
  providerJobsCount?: number | null;
  providerRank?: string | null;
  providerBio?: string | null;
  providerBioTranslations?: { en?: string; fr?: string; ar?: string };
  providerExperience?: string | null;
  providerBadge?: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  serviceIcon: string | null;
  selectedCar?: any;
  carRentalNote?: string;
  carRentalDates?: any;
  providerAddress?: string;
  providerCoords?: { lat: number; lng: number } | null;
  date?: string;
  time?: string;
  multiSlots?: { date: string; time: string }[];
  serviceDetails?: ServiceDetails;
  setupProfileId?: string;
  isPublic?: boolean;
  description?: string;
  recipientDetails?: { name: string; phone: string; address?: string } | null;
  estimate?: any; // Stores the final PricingBreakdown
  // TV Mounting specific
  tvCount?: number;
  mountTypes?: string[];
  wallMaterial?: string;
  liftingHelp?: string;
  mountingAddOns?: string[];
  vehicleType?: string | null;
}

interface OrderContextType {
  order: OrderState;
  setOrderField: (key: keyof OrderState, value: any) => void;
  setOrderState: (state: OrderState) => void;
  resetOrder: () => void;
}

const defaultOrder: OrderState = {
  serviceType: '',
  serviceName: '',
  subServiceId: '',
  subServiceName: '',
  location: null,
  discoveryLocation: null,
  providerId: null,
  providerName: null,
  providerAvatar: null,
  providerRate: null,
  providerRating: null,
  providerJobsCount: null,
  providerRank: null,
  providerBio: null,
  providerBioTranslations: {},
  providerExperience: null,
  providerBadge: null,
  scheduledDate: null,
  scheduledTime: null,
  serviceIcon: null,
  serviceDetails: {},
  setupProfileId: '',
  isPublic: false,
  multiSlots: [],
  // TV Mounting specific
  tvCount: 1,
  mountTypes: [],
  wallMaterial: '',
  liftingHelp: '',
  mountingAddOns: [],
  vehicleType: null,
};

const OrderContext = createContext<OrderContextType | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderState>(defaultOrder);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lbricol_pending_order');
      if (saved) {
        setOrder(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved order:", e);
    }
  }, []);

  // Save to localStorage whenever order changes
  useEffect(() => {
    if (order && order.serviceType) {
      localStorage.setItem('lbricol_pending_order', JSON.stringify(order));
    }
  }, [order]);

  const setOrderField = (key: keyof OrderState, value: any) => {
    setOrder(prev => ({ ...prev, [key]: value }));
  };

  const setOrderState = (state: OrderState) => {
    setOrder(state);
  };

  const resetOrder = () => {
    setOrder(defaultOrder);
    localStorage.removeItem('lbricol_pending_order');
  };

  return (
    <OrderContext.Provider value={{ order, setOrderField, setOrderState, resetOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
