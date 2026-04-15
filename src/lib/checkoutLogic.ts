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

import { COUNTRY_DATA, validatePhone } from './phoneUtils';

export function validatePhoneNumber(phone: string): boolean {
  // Try to find a country that matches, or just validate against a general international format if it starts with +
  if (phone.startsWith('+')) {
    // If it starts with +, we should check if it's a valid E.164-ish number
    return /^\+[1-9]\d{1,14}$/.test(phone.replace(/\s+/g, ''));
  }
  
  // Default to Morocco validation if no prefix (maintaining backward compatibility for simple inputs)
  return /^(?:0|212)[5-7]\d{8}$/.test(phone.replace(/\s+/g, ''));
}

// ────────── Promo Code Validation ──────────────────────────────

// ────────── Promo Code Validation ──────────────────────────────
import { query, where, getDocs, collection, limit } from 'firebase/firestore';
import { db } from './firebase';

export async function validatePromoCode(code: string): Promise<{
  valid: boolean;
  discount: number;
  message: string;
}> {
  if (!code.trim()) return { valid: false, discount: 0, message: '' };
  
  try {
    const q = query(
      collection(db, 'promo_codes'),
      where('code', '==', code.toUpperCase().trim()),
      where('isActive', '==', true),
      limit(1)
    );

    const snap = await getDocs(q);
    
    if (snap.empty) {
      return { valid: false, discount: 0, message: 'Invalid or expired code' };
    }

    const data = snap.docs[0].data();
    
    // Check expiration if present
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return { valid: false, discount: 0, message: 'Code expired' };
    }

    return {
      valid: true,
      discount: data.discountAmount || 0,
      message: `Discount: ${data.discountAmount} MAD`,
    };
  } catch (error) {
    console.error('Promo validation error:', error);
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

// ────────── Order Submission ──────────────────────────────────
import { addDoc, serverTimestamp } from 'firebase/firestore';

export async function submitOrder(state: CheckoutState): Promise<{
  orderId: string;
  orderNumber: string;
  estimatedDeliveryTime: string;
}> {
  const validation = validateCheckout(state);
  if (!validation.valid) {
    throw new Error('Validation failed: ' + Object.values(validation.errors).join(', '));
  }
  
  const orderNumber = `LB-${Math.floor(100000 + Math.random() * 900000)}`;
  
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
    status: 'pending',
    orderNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  try {
    const docRef = await addDoc(collection(db, 'jobs'), orderPayload);
    
    return {
      orderId: docRef.id,
      orderNumber,
      estimatedDeliveryTime: '30-45 minutes'
    };
  } catch (error: any) {
    console.error('Firestore Error submitOrder:', error);
    throw new Error('Failed to create order: ' + error.message);
  }
}
