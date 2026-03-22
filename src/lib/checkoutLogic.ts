import { getRoadDistance, calculateDistance } from './calculateDistance';
import { CheckoutState, PricingData } from './checkoutTypes';

// ────────── Distance & Pricing ──────────────────────────────────

export async function getRoadDistanceAndPrice(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  deliveryType: 'standard' | 'scheduled',
  promoCodeDiscount: number = 0
): Promise<{ roadInfo: { distanceKm: number; durationMinutes: number }; pricing: PricingData }> {
  const roadInfo = await getRoadDistance(fromLat, fromLng, toLat, toLng);
  const pricing = calculateDeliveryFee(roadInfo.distanceKm, deliveryType, promoCodeDiscount);
  return { roadInfo, pricing };
}

export function calculateDeliveryFee(
  distanceKm: number,
  deliveryType: 'standard' | 'scheduled',
  promoCodeDiscount: number = 0
): PricingData {
  // Base: 2 MAD per km, minimum 5 MAD
  const baseFee = Math.max(distanceKm * 2, 5);
  
  // Scheduling premium: 2 MAD extra for scheduled delivery
  const schedulingPremium = deliveryType === 'scheduled' ? 2 : 0;
  
  // Subtotal
  const subtotal = baseFee + schedulingPremium;
  
  // Service fee: 10% of subtotal
  const serviceFee = Math.round(subtotal * 0.10);
  
  // Apply promo code discount
  const total = Math.max(subtotal + serviceFee - promoCodeDiscount, 0);
  
  return {
    baseDeliveryFee: Math.round(baseFee * 10) / 10,
    schedulingPremium,
    subtotal,
    serviceFee: Math.round(serviceFee * 10) / 10,
    discount: promoCodeDiscount,
    total: Math.round(total * 10) / 10,
  };
}

// ────────── Validation ──────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateCheckout(state: CheckoutState): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Required: pickup location
  if (!state.pickupLocation.address) errors.pickup = 'Enter pickup location';
  if (!state.pickupLocation.lat || !state.pickupLocation.lng) errors.pickupCoords = 'Invalid pickup location';
  
  // Required: dropoff location
  if (!state.dropoffLocation.address) errors.dropoff = 'Enter dropoff location';
  if (!state.dropoffLocation.lat || !state.dropoffLocation.lng) errors.dropoffCoords = 'Invalid dropoff location';
  
  // Required: order description
  if (!state.orderDescription.trim()) errors.orderDescription = 'Describe what needs transporting';
  
  // Required: delivery type
  if (!state.deliveryType) errors.deliveryType = 'Select delivery type';
  
  // If scheduled: must have valid time
  if (state.deliveryType === 'scheduled') {
    if (!state.scheduledTime) errors.scheduledTime = 'Select delivery time';
    // Validate time is in future
    const selectedTime = new Date(state.scheduledTime || '');
    if (selectedTime <= new Date()) errors.scheduledTime = 'Select a future time';
  }
  
  // If sending to someone else: require name + phone
  if (state.sendingToSomeoneElse) {
    if (!state.recipientDetails.name.trim()) errors.recipientName = 'Enter recipient name';
    if (!state.recipientDetails.phone.trim()) errors.recipientPhone = 'Enter recipient phone';
    if (!validatePhoneNumber(state.recipientDetails.phone)) errors.recipientPhone = 'Invalid phone number';
  }
  
  // Required: payment method
  if (!state.paymentMethod) errors.paymentMethod = 'Select payment method';
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePhoneNumber(phone: string): boolean {
  // Morocco: +212, 0x, or 212x format
  const moroccoPhone = /^(?:\+212|0|212)[5-7]\d{8}$/.test(phone.replace(/\s+/g, ''));
  return moroccoPhone;
}

// ────────── Promo Code Validation ──────────────────────────────

export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  discount: number;
  message: string;
}> {
  try {
    const response = await fetch(`/api/promo-codes/${code.toUpperCase().trim()}`, {
      method: 'GET',
    });
    
    if (!response.ok) {
      return { valid: false, discount: 0, message: 'Code not found or expired' };
    }
    
    const data = await response.json();
    return {
      valid: true,
      discount: data.discountAmount || 0,
      message: `Discount: ${data.discountAmount} MAD`,
    };
  } catch {
    return { valid: false, discount: 0, message: 'Error validating code' };
  }
}

// ────────── Location Autocomplete ──────────────────────────────

export async function searchLocations(query: string): Promise<Array<{
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}>> {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=ma`
    );
    
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((result: any) => ({
      address: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      placeId: result.place_id?.toString(),
    }));
  } catch {
    return [];
  }
}

// ────────── Order Submission ──────────────────────────────────

export async function submitOrder(state: CheckoutState): Promise<{
  orderId: string;
  orderNumber: string;
  estimatedDeliveryTime: string;
}> {
  const validation = validateCheckout(state);
  if (!validation.valid) {
    throw new Error('Validation failed: ' + Object.values(validation.errors).join(', '));
  }
  
  const orderPayload = {
    pickup: {
      address: state.pickupLocation.address,
      lat: state.pickupLocation.lat,
      lng: state.pickupLocation.lng,
    },
    dropoff: {
      address: state.dropoffLocation.address,
      lat: state.dropoffLocation.lat,
      lng: state.dropoffLocation.lng,
    },
    recipientDetails: state.sendingToSomeoneElse ? state.recipientDetails : null,
    orderDescription: state.orderDescription,
    deliveryType: state.deliveryType,
    scheduledTime: state.scheduledTime,
    paymentMethod: state.paymentMethod,
    promoCode: state.promoCode,
    pricing: state.pricing,
    roadDistance: state.roadDistance,
    roadDurationMinutes: state.roadDurationMinutes,
    createdAt: new Date().toISOString(),
  };
  
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }
  
  return response.json();
}
