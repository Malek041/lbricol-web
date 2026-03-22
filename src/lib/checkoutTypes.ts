export interface Location {
  address: string;
  lat: number | null;
  lng: number | null;
  placeId?: string;
}

export interface RecipientDetails {
  name: string;
  phone: string;
  address?: string;
}

export interface PricingData {
  baseDeliveryFee: number;
  schedulingPremium: number;
  subtotal: number;
  serviceFee: number; // 10% of subtotal
  discount: number;
  total: number;
}

export interface CheckoutState {
  // Locations
  pickupLocation: Location;
  dropoffLocation: Location;
  
  // Recipient
  sendingToSomeoneElse: boolean;
  recipientDetails: RecipientDetails;
  
  // Order
  orderDescription: string;
  
  // Delivery
  deliveryType: 'standard' | 'scheduled'; // standard = ASAP
  scheduledTime: string | null; // ISO timestamp
  
  // Payment
  paymentMethod: string; // 'card', 'cash', 'wallet', etc.
  promoCode: string;
  promoCodeValid: boolean;
  promoCodeDiscount: number;
  
  // Calculated
  pricing: PricingData;
  
  // Distance (for reference, from road routing)
  roadDistance: number | null;
  roadDurationMinutes: number | null;
  
  // UI
  isLoading: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isFormValid: boolean;
  locationSearchResults: {
    pickup: Array<{ address: string; lat: number; lng: number; placeId?: string }>;
    dropoff: Array<{ address: string; lat: number; lng: number; placeId?: string }>;
  };
}
