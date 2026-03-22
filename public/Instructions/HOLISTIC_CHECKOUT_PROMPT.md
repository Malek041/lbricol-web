# Lbricol Errands Checkout Build — Holistic Development Prompt for AI Agent

## 🎯 MISSION

Build a **fully functional, production-ready checkout view** for the Lbricol errands service that:

1. **Matches the Goal UI design** (single-column mobile layout)
2. **Calculates real road distances** using OpenRouteService API
3. **Prices deliveries accurately** based on actual driving distance
4. **Handles all user interactions** (location search, promo codes, delivery options)
5. **Validates form and submits orders** with complete payload

This is not a mockup. This is a complete, end-to-end feature.
---

## 📚 CONTEXT & DEPENDENCIES

### Tech Stack
- **Framework**: Next.js (React 18)
- **State**: React hooks (useState, useEffect, useContext)
- **Maps**: Leaflet + React-Leaflet (already in project)
- **Geocoding**: Nominatim/OpenStreetMap (already integrated)
- **Routing/Distance**: OpenRouteService API (new, documented below)
- **Database**: Firebase Firestore (orders collection)
- **Environment**: `.env.local` for API keys

### Existing Lbricol Code You'll Work With
- `/lib/calculateDistance.ts` — **You will update this** (add `getRoadDistance` function)
- `/lib/matchBricolers.ts` — **You will update this** (improve scoring, add road distance to results)
- `/lib/firebase.ts` — Already set up, use for orders collection
- `/app/order/step2/page.tsx` — Provider card display (you'll update to show road distance + time)
- Nominatim integration — Already working, use for location autocomplete

### Critical Files You Will Create
- `/app/checkout/page.tsx` — Main checkout component
- `/app/checkout/components/` — Subcomponents (LocationInput, DeliveryOptions, etc.)
- `/lib/checkoutLogic.ts` — Pure functions (validation, pricing calculation, promo code logic)
- `/lib/checkoutTypes.ts` — TypeScript types for checkout state

### Critical Files You Will NOT Touch
- `/app/order/step1/page.tsx` — Order creation (read-only)
- `/components/MapView.tsx` — Map display (read-only, used separately)
- Auth screens, dashboard, etc. — Untouched

---

## 🚀 IMPLEMENTATION ROADMAP

### PHASE 1: Distance Calculation Upgrade (Hours 1-2)

#### Step 1a — Environment Setup
- [ ] Instruct user to add API key to `.env.local`:
  ```
  NEXT_PUBLIC_ORS_API_KEY=your_key_here
  ```
  - User gets key from [openrouteservice.org](https://openrouteservice.org) → sign up → Dashboard
  - Free tier, no credit card required

#### Step 1b — Update `/lib/calculateDistance.ts`
Keep the existing `calculateDistance()` function (haversine) **unchanged** — it's used for ranking Bricolers.

Add new `getRoadDistance()` function:
```typescript
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
  } catch {
    // Fallback to haversine estimate if API fails or key missing
    const straight = calculateDistance(fromLat, fromLng, toLat, toLng);
    return {
      distanceKm: straight,
      durationMinutes: Math.round(straight * 3), // rough estimate: 3 min per km
    };
  }
}
```

**Key rules**:
- `calculateDistance` (haversine) — **fast, no API call**, used only for Bricoler ranking/matching
- `getRoadDistance` — **real driving distance via API**, called only for providers shown to user
- **Never call `getRoadDistance` in loops** — it exhausts free API tier
- Fallback ensures app never breaks if API key missing or request fails

#### Step 1c — Improve `/lib/matchBricolers.ts`
Update the scoring algorithm to use composite weighted score:
- 30% Distance (haversine)
- 25% Rating (Bayesian smoothing for new providers)
- 20% Completed jobs
- 15% Badge (elite/pro/classic/new)
- 10% Experience
- +8 bonus if available today

Include "new Bricoler protection": Providers with 0 jobs get inserted at 66% position in sorted list, giving exposure without appearing at top.

**Critical**: Do not call `getRoadDistance()` inside `matchBricolers()`. Only return Haversine distance in the bricoler object for reference. The road distance will be fetched **separately** when displaying individual provider cards.

#### Step 1d — Update Provider Card in `/app/order/step2/page.tsx`
Add road distance display to each provider card:
```typescript
import { getRoadDistance } from '@/lib/calculateDistance';

const [roadInfo, setRoadInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

useEffect(() => {
  if (!provider.base_lat || !provider.base_lng) return;
  getRoadDistance(clientLat, clientLng, provider.base_lat, provider.base_lng)
    .then(setRoadInfo);
}, [provider.id]);

// Display:
{roadInfo ? (
  <span style={{ fontSize: 11, color: '#6B7280' }}>
    🚗 {roadInfo.distanceKm} km · ~{roadInfo.durationMinutes} min
  </span>
) : (
  <span style={{ fontSize: 11, color: '#D1D5DB' }}>
    calculating...
  </span>
)}
```

**After Phase 1 is complete**: Bricoler matching uses haversine for speed, provider cards show real road distance + time. ✅

---

### PHASE 2: Checkout State & Logic (Hours 3-5)

#### Step 2a — Create `/lib/checkoutTypes.ts`
Define TypeScript interfaces:
```typescript
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
```

#### Step 2b — Create `/lib/checkoutLogic.ts`
Pure functions for checkout logic:

```typescript
import { getRoadDistance } from './calculateDistance';
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
    serviceFee,
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
```

**After Phase 2**: All business logic, validation, and pricing calculations are pure functions. ✅

---

### PHASE 3: Checkout Component & UI (Hours 6-10)

#### Step 3a — Create `/app/checkout/page.tsx`
Main page that orchestrates the entire checkout flow.

Structure:
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutState, PricingData } from '@/lib/checkoutTypes';
import {
  validateCheckout,
  validatePromoCode,
  searchLocations,
  getRoadDistanceAndPrice,
  submitOrder,
} from '@/lib/checkoutLogic';
import WarningBanner from './components/WarningBanner';
import LocationSection from './components/LocationSection';
import MapDisplay from './components/MapDisplay';
import RecipientDetails from './components/RecipientDetails';
import DeliveryOptions from './components/DeliveryOptions';
import OrderDescription from './components/OrderDescription';
import PaymentSection from './components/PaymentSection';
import SummaryBox from './components/SummaryBox';
import CheckoutButton from './components/CheckoutButton';

const initialState: CheckoutState = {
  pickupLocation: { address: '', lat: null, lng: null },
  dropoffLocation: { address: '', lat: null, lng: null },
  sendingToSomeoneElse: false,
  recipientDetails: { name: '', phone: '', address: '' },
  orderDescription: '',
  deliveryType: 'standard',
  scheduledTime: null,
  paymentMethod: '',
  promoCode: '',
  promoCodeValid: false,
  promoCodeDiscount: 0,
  pricing: {
    baseDeliveryFee: 0,
    schedulingPremium: 0,
    subtotal: 0,
    serviceFee: 0,
    discount: 0,
    total: 0,
  },
  roadDistance: null,
  roadDurationMinutes: null,
  isLoading: false,
  errors: {},
  touched: {},
  isFormValid: false,
  locationSearchResults: { pickup: [], dropoff: [] },
};

export default function CheckoutPage() {
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>(initialState);
  const [isValidating, setIsValidating] = useState(false);

  // ──── Recalculate pricing when distance or delivery type changes ────
  useEffect(() => {
    if (!state.pickupLocation.lat || !state.dropoffLocation.lat) return;
    
    (async () => {
      try {
        const { roadInfo, pricing } = await getRoadDistanceAndPrice(
          state.pickupLocation.lat!,
          state.pickupLocation.lng!,
          state.dropoffLocation.lat!,
          state.dropoffLocation.lng!,
          state.deliveryType,
          state.promoCodeDiscount
        );
        
        setState(prev => ({
          ...prev,
          roadDistance: roadInfo.distanceKm,
          roadDurationMinutes: roadInfo.durationMinutes,
          pricing,
        }));
      } catch (error) {
        console.error('Failed to calculate pricing:', error);
      }
    })();
  }, [state.pickupLocation.lat, state.pickupLocation.lng, state.dropoffLocation.lat, state.dropoffLocation.lng, state.deliveryType, state.promoCodeDiscount]);

  // ──── Validate form when state changes ────
  useEffect(() => {
    const validation = validateCheckout(state);
    setState(prev => ({
      ...prev,
      isFormValid: validation.valid,
      errors: validation.errors,
    }));
  }, [state.pickupLocation, state.dropoffLocation, state.orderDescription, state.deliveryType, state.scheduledTime, state.sendingToSomeoneElse, state.recipientDetails, state.paymentMethod]);

  // ──── Location search ────
  const handleLocationSearch = useCallback(async (query: string, type: 'pickup' | 'dropoff') => {
    const results = await searchLocations(query);
    setState(prev => ({
      ...prev,
      locationSearchResults: {
        ...prev.locationSearchResults,
        [type]: results,
      },
    }));
  }, []);

  // ──── Location selection ────
  const handleLocationSelect = useCallback((location: { address: string; lat: number; lng: number }, type: 'pickup' | 'dropoff') => {
    setState(prev => ({
      ...prev,
      [type === 'pickup' ? 'pickupLocation' : 'dropoffLocation']: {
        address: location.address,
        lat: location.lat,
        lng: location.lng,
      },
      locationSearchResults: {
        ...prev.locationSearchResults,
        [type]: [],
      },
    }));
  }, []);

  // ──── Delivery type change ────
  const handleDeliveryTypeChange = useCallback((type: 'standard' | 'scheduled') => {
    setState(prev => ({
      ...prev,
      deliveryType: type,
      scheduledTime: type === 'standard' ? null : prev.scheduledTime,
    }));
  }, []);

  // ──── Scheduled time selection ────
  const handleScheduledTimeChange = useCallback((time: string) => {
    setState(prev => ({
      ...prev,
      scheduledTime: time,
    }));
  }, []);

  // ──── Promo code validation ────
  const handlePromoCodeChange = useCallback((code: string) => {
    setState(prev => ({
      ...prev,
      promoCode: code,
      promoCodeValid: false,
      promoCodeDiscount: 0,
    }));
  }, []);

  const handleApplyPromoCode = useCallback(async (code: string) => {
    setIsValidating(true);
    try {
      const result = await validatePromoCode(code);
      if (result.valid) {
        setState(prev => ({
          ...prev,
          promoCodeValid: true,
          promoCodeDiscount: result.discount,
        }));
      } else {
        setState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            promoCode: result.message,
          },
        }));
      }
    } finally {
      setIsValidating(false);
    }
  }, []);

  // ──── Order submission ────
  const handleSubmitOrder = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await submitOrder(state);
      // Redirect to confirmation page
      router.push(`/order-confirmation/${result.orderId}`);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          submit: error.message,
        },
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state, router]);

  // ──── Navigation ────
  const handleBack = () => {
    // Confirm if unsaved changes
    if (state.orderDescription || state.pickupLocation.address || state.dropoffLocation.address) {
      if (confirm('Discard unsaved changes?')) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    if (confirm('Cancel checkout?')) {
      router.push('/');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Checkout</h1>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>
          ✕
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <WarningBanner />

        <LocationSection
          pickupLocation={state.pickupLocation}
          dropoffLocation={state.dropoffLocation}
          searchResults={state.locationSearchResults}
          onSearch={handleLocationSearch}
          onSelectPickup={(loc) => handleLocationSelect(loc, 'pickup')}
          onSelectDropoff={(loc) => handleLocationSelect(loc, 'dropoff')}
          errors={state.errors}
        />

        {state.pickupLocation.lat && state.dropoffLocation.lat && (
          <MapDisplay
            pickupLat={state.pickupLocation.lat}
            pickupLng={state.pickupLocation.lng!}
            dropoffLat={state.dropoffLocation.lat}
            dropoffLng={state.dropoffLocation.lng!}
          />
        )}

        {state.sendingToSomeoneElse && (
          <RecipientDetails
            details={state.recipientDetails}
            onChange={(details) => setState(prev => ({ ...prev, recipientDetails: details }))}
            errors={state.errors}
          />
        )}

        <OrderDescription
          value={state.orderDescription}
          onChange={(desc) => setState(prev => ({ ...prev, orderDescription: desc }))}
          errors={state.errors}
        />

        <DeliveryOptions
          deliveryType={state.deliveryType}
          scheduledTime={state.scheduledTime}
          onDeliveryTypeChange={handleDeliveryTypeChange}
          onScheduledTimeChange={handleScheduledTimeChange}
          errors={state.errors}
        />

        <PaymentSection
          paymentMethod={state.paymentMethod}
          promoCode={state.promoCode}
          promoCodeValid={state.promoCodeValid}
          isValidating={isValidating}
          onPaymentMethodChange={(method) => setState(prev => ({ ...prev, paymentMethod: method }))}
          onPromoCodeChange={handlePromoCodeChange}
          onApplyPromoCode={handleApplyPromoCode}
          errors={state.errors}
        />

        <SummaryBox pricing={state.pricing} roadDistance={state.roadDistance} roadDurationMinutes={state.roadDurationMinutes} />

        {state.errors.submit && (
          <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {state.errors.submit}
          </div>
        )}
      </div>

      {/* Footer: Submit Button */}
      <div style={{ padding: '16px', borderTop: '1px solid #E5E7EB' }}>
        <CheckoutButton
          onClick={handleSubmitOrder}
          disabled={!state.isFormValid || state.isLoading}
          isLoading={state.isLoading}
        />
      </div>
    </div>
  );
}
```

#### Step 3b — Create Subcomponents in `/app/checkout/components/`

**WarningBanner.tsx**:
```typescript
export default function WarningBanner() {
  return (
    <div style={{
      background: '#F3F4F6',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '24px',
      display: 'flex',
      gap: '12px',
    }}>
      <div style={{ fontSize: 20 }}>ℹ️</div>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>
        The courier cannot purchase products for you. If you ask them to do so, the order will be cancelled.
      </div>
    </div>
  );
}
```

**LocationSection.tsx**:
```typescript
import LocationInput from './LocationInput';

interface LocationSectionProps {
  pickupLocation: { address: string; lat: number | null; lng: number | null };
  dropoffLocation: { address: string; lat: number | null; lng: number | null };
  searchResults: { pickup: any[]; dropoff: any[] };
  onSearch: (query: string, type: 'pickup' | 'dropoff') => void;
  onSelectPickup: (location: any) => void;
  onSelectDropoff: (location: any) => void;
  errors: Record<string, string>;
}

export default function LocationSection(props: LocationSectionProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: '12px' }}>Delivery details</h2>
      
      <LocationInput
        label="Where from?"
        icon="📍"
        value={props.pickupLocation.address}
        results={props.searchResults.pickup}
        onSearch={(q) => props.onSearch(q, 'pickup')}
        onSelect={props.onSelectPickup}
        error={props.errors.pickup || props.errors.pickupCoords}
      />

      <LocationInput
        label="Where to?"
        icon="📍"
        value={props.dropoffLocation.address}
        results={props.searchResults.dropoff}
        onSearch={(q) => props.onSearch(q, 'dropoff')}
        onSelect={props.onSelectDropoff}
        error={props.errors.dropoff || props.errors.dropoffCoords}
      />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid #F3F4F6',
      }}>
        <input
          type="checkbox"
          id="sendToOther"
          style={{ cursor: 'pointer' }}
          onChange={(e) => {}}
        />
        <label htmlFor="sendToOther" style={{ cursor: 'pointer', fontSize: 14 }}>
          Sending to someone else?
        </label>
      </div>
    </div>
  );
}
```

**LocationInput.tsx**:
```typescript
import { useState } from 'react';

interface LocationInputProps {
  label: string;
  icon: string;
  value: string;
  results: any[];
  onSearch: (query: string) => void;
  onSelect: (location: any) => void;
  error?: string;
}

export default function LocationInput(props: LocationInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={props.label}
          value={props.value}
          onChange={(e) => {
            props.onSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 36px',
            border: props.error ? '2px solid #DC2626' : '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
          {props.icon}
        </div>

        {isOpen && props.results.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #D1D5DB',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 10,
          }}>
            {props.results.map((result, i) => (
              <div
                key={i}
                onClick={() => {
                  props.onSelect(result);
                  setIsOpen(false);
                }}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #F3F4F6',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {result.address}
              </div>
            ))}
          </div>
        )}
      </div>
      {props.error && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.error}
        </div>
      )}
    </div>
  );
}
```

**MapDisplay.tsx**:
```typescript
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

interface MapDisplayProps {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}

// Fix Leaflet icon issue
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-green.png',
  iconSize: [25, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-blue.png',
  iconSize: [25, 41],
});

export default function MapDisplay(props: MapDisplayProps) {
  const center = [
    (props.pickupLat + props.dropoffLat) / 2,
    (props.pickupLng + props.dropoffLng) / 2,
  ] as [number, number];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '250px', width: '100%', borderRadius: '8px', marginBottom: '24px' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[props.pickupLat, props.pickupLng]} icon={pickupIcon}>
        <Popup>Pickup</Popup>
      </Marker>
      <Marker position={[props.dropoffLat, props.dropoffLng]} icon={dropoffIcon}>
        <Popup>Dropoff</Popup>
      </Marker>
      <Polyline
        positions={[[props.pickupLat, props.pickupLng], [props.dropoffLat, props.dropoffLng]]}
        color="teal"
        weight={2}
        opacity={0.7}
      />
    </MapContainer>
  );
}
```

**DeliveryOptions.tsx**:
```typescript
interface DeliveryOptionsProps {
  deliveryType: 'standard' | 'scheduled';
  scheduledTime: string | null;
  onDeliveryTypeChange: (type: 'standard' | 'scheduled') => void;
  onScheduledTimeChange: (time: string) => void;
  errors: Record<string, string>;
}

export default function DeliveryOptions(props: DeliveryOptionsProps) {
  const minTime = new Date();
  minTime.setMinutes(minTime.getMinutes() + 30);
  const minTimeStr = minTime.toISOString().slice(0, 16);

  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: '12px' }}>Delivery options</h2>

      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
        <input
          type="radio"
          name="deliveryType"
          value="standard"
          checked={props.deliveryType === 'standard'}
          onChange={() => props.onDeliveryTypeChange('standard')}
        />
        <span style={{ fontSize: 14 }}>Standard — As soon as possible</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
        <input
          type="radio"
          name="deliveryType"
          value="scheduled"
          checked={props.deliveryType === 'scheduled'}
          onChange={() => props.onDeliveryTypeChange('scheduled')}
        />
        <span style={{ fontSize: 14 }}>Schedule — Select time</span>
      </label>

      {props.deliveryType === 'scheduled' && (
        <input
          type="datetime-local"
          value={props.scheduledTime || ''}
          onChange={(e) => props.onScheduledTimeChange(e.target.value)}
          min={minTimeStr}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '12px',
            border: props.errors.scheduledTime ? '2px solid #DC2626' : '1px solid #D1D5DB',
            borderRadius: '8px',
            fontSize: 14,
            boxSizing: 'border-box',
          }}
        />
      )}

      {props.errors.deliveryType && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.errors.deliveryType}
        </div>
      )}
      {props.errors.scheduledTime && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.errors.scheduledTime}
        </div>
      )}
    </div>
  );
}
```

**OrderDescription.tsx**:
```typescript
interface OrderDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  errors: Record<string, string>;
}

export default function OrderDescription(props: OrderDescriptionProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: '8px' }}>
        What do you need transporting?
      </label>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="Describe what needs to be transported..."
        style={{
          width: '100%',
          padding: '12px',
          border: props.errors.orderDescription ? '2px solid #DC2626' : '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: 14,
          minHeight: '100px',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
      <div style={{ fontSize: 12, color: '#6B7280', marginTop: '4px' }}>
        {props.value.length}/500
      </div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: '4px' }}>
        💡 Note: We cannot purchase items. Bring your own items or items to be transported.
      </div>
      {props.errors.orderDescription && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.errors.orderDescription}
        </div>
      )}
    </div>
  );
}
```

**PaymentSection.tsx**:
```typescript
interface PaymentSectionProps {
  paymentMethod: string;
  promoCode: string;
  promoCodeValid: boolean;
  isValidating: boolean;
  onPaymentMethodChange: (method: string) => void;
  onPromoCodeChange: (code: string) => void;
  onApplyPromoCode: (code: string) => void;
  errors: Record<string, string>;
}

export default function PaymentSection(props: PaymentSectionProps) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: '12px' }}>Payment method</h2>

      <select
        value={props.paymentMethod}
        onChange={(e) => props.onPaymentMethodChange(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          border: props.errors.paymentMethod ? '2px solid #DC2626' : '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: 14,
          boxSizing: 'border-box',
        }}
      >
        <option value="">Select a payment method</option>
        <option value="card">Credit/Debit Card</option>
        <option value="cash">Cash on Delivery</option>
        <option value="wallet">Wallet</option>
      </select>

      {props.errors.paymentMethod && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.errors.paymentMethod}
        </div>
      )}

      <details style={{ marginTop: '12px' }}>
        <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          Got a promo code?
        </summary>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={props.promoCode}
            onChange={(e) => props.onPromoCodeChange(e.target.value)}
            placeholder="Enter code"
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={() => props.onApplyPromoCode(props.promoCode)}
            disabled={!props.promoCode || props.isValidating}
            style={{
              padding: '12px 16px',
              background: '#16A085',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: 14,
              fontWeight: 600,
              cursor: props.promoCode && !props.isValidating ? 'pointer' : 'not-allowed',
              opacity: props.promoCode && !props.isValidating ? 1 : 0.5,
            }}
          >
            {props.isValidating ? 'Checking...' : 'Apply'}
          </button>
        </div>
        {props.promoCodeValid && (
          <div style={{ color: '#059669', fontSize: 12, marginTop: '8px' }}>
            ✓ Promo code applied!
          </div>
        )}
        {props.errors.promoCode && (
          <div style={{ color: '#DC2626', fontSize: 12, marginTop: '8px' }}>
            {props.errors.promoCode}
          </div>
        )}
      </details>
    </div>
  );
}
```

**SummaryBox.tsx**:
```typescript
import { PricingData } from '@/lib/checkoutTypes';

interface SummaryBoxProps {
  pricing: PricingData;
  roadDistance: number | null;
  roadDurationMinutes: number | null;
}

export default function SummaryBox(props: SummaryBoxProps) {
  return (
    <div style={{
      background: '#F3F4F6',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
    }}>
      {props.roadDistance && (
        <div style={{ fontSize: 12, color: '#6B7280', marginBottom: '12px' }}>
          🚗 {props.roadDistance} km · ~{props.roadDurationMinutes} min
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: '8px' }}>
        <span>Delivery</span>
        <span>{props.pricing.baseDeliveryFee.toFixed(2)} MAD</span>
      </div>

      {props.pricing.schedulingPremium > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: '8px' }}>
          <span>Scheduling</span>
          <span>{props.pricing.schedulingPremium} MAD</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: '12px' }}>
        <span>Services</span>
        <span>{props.pricing.serviceFee.toFixed(2)} MAD</span>
      </div>

      {props.pricing.discount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#059669', marginBottom: '12px' }}>
          <span>Discount</span>
          <span>-{props.pricing.discount.toFixed(2)} MAD</span>
        </div>
      )}

      <div style={{
        borderTop: '1px solid #D1D5DB',
        paddingTop: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 16,
        fontWeight: 700,
      }}>
        <span>Total to pay</span>
        <span>{props.pricing.total.toFixed(2)} MAD</span>
      </div>
    </div>
  );
}
```

**CheckoutButton.tsx**:
```typescript
interface CheckoutButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export default function CheckoutButton(props: CheckoutButtonProps) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: props.disabled ? '#D1D5DB' : '#16A085',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: 16,
        fontWeight: 600,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {props.isLoading ? 'Processing...' : 'Pay to order'}
    </button>
  );
}
```

**RecipientDetails.tsx** (conditional, shown when "Sending to someone else" is true):
```typescript
interface RecipientDetailsProps {
  details: { name: string; phone: string; address?: string };
  onChange: (details: any) => void;
  errors: Record<string, string>;
}

export default function RecipientDetails(props: RecipientDetailsProps) {
  return (
    <div style={{ marginBottom: '24px', background: '#F9FAFB', padding: '16px', borderRadius: '8px' }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: '12px' }}>Recipient details</h2>

      <input
        type="text"
        placeholder="Recipient name"
        value={props.details.name}
        onChange={(e) => props.onChange({ ...props.details, name: e.target.value })}
        style={{
          width: '100%',
          padding: '12px',
          border: props.errors.recipientName ? '2px solid #DC2626' : '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: 14,
          marginBottom: '12px',
          boxSizing: 'border-box',
        }}
      />

      <input
        type="tel"
        placeholder="Recipient phone"
        value={props.details.phone}
        onChange={(e) => props.onChange({ ...props.details, phone: e.target.value })}
        style={{
          width: '100%',
          padding: '12px',
          border: props.errors.recipientPhone ? '2px solid #DC2626' : '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: 14,
          boxSizing: 'border-box',
        }}
      />

      {props.errors.recipientName && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.errors.recipientName}
        </div>
      )}
      {props.errors.recipientPhone && (
        <div style={{ color: '#DC2626', fontSize: 12, marginTop: '4px' }}>
          {props.errors.recipientPhone}
        </div>
      )}
    </div>
  );
}
```

**After Phase 3**: Full checkout UI with all interactive components. ✅

---

### PHASE 4: API Endpoints & Backend Integration (Hours 11-12)

#### Step 4a — Create `/app/api/orders/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Validate payload (basic check)
    if (!payload.pickup?.address || !payload.dropoff?.address || !payload.orderDescription) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order document in Firestore
    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, {
      ...payload,
      status: 'pending', // pending → matched → accepted → completed
      createdAt: serverTimestamp(),
    });

    // Generate order number (e.g., ORD-20260322-001234)
    const orderNumber = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 100000)}`;

    // Return confirmation
    return NextResponse.json({
      orderId: docRef.id,
      orderNumber,
      estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
```

#### Step 4b — Create `/app/api/promo-codes/[code]/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.toUpperCase();

    // Query promo codes collection
    const promoCodesRef = collection(db, 'promoCodes');
    const q = query(
      promoCodesRef,
      where('code', '==', code),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json(
        { message: 'Code not found or expired' },
        { status: 404 }
      );
    }

    const promoData = snapshot.docs[0].data();

    // Check expiration
    if (promoData.expiresAt && new Date(promoData.expiresAt) < new Date()) {
      return NextResponse.json(
        { message: 'Code expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: promoData.code,
      discountAmount: promoData.discountAmount,
      description: promoData.description,
    });
  } catch (error: any) {
    console.error('Promo code lookup error:', error);
    return NextResponse.json(
      { message: error.message || 'Error validating code' },
      { status: 500 }
    );
  }
}
```

**After Phase 4**: Backend API endpoints ready. ✅

---

### PHASE 5: Testing & Refinement (Hours 13-14)

#### Testing Checklist
- [ ] Location autocomplete returns Morocco results
- [ ] Pickup & dropoff locations store lat/lng correctly
- [ ] Map displays with correct pins
- [ ] Road distance API called (check browser console → Network tab)
- [ ] Pricing updates when locations change
- [ ] Delivery type toggle works (standard ↔ scheduled)
- [ ] Time picker shows only future times
- [ ] Promo code validation calls API
- [ ] Form validation prevents submit with missing fields
- [ ] "Sending to someone else" toggle shows/hides recipient fields
- [ ] Order submission calls `/api/orders` with correct payload
- [ ] Successful order redirects to confirmation page
- [ ] Error messages display clearly on field errors
- [ ] Back button confirms unsaved changes
- [ ] Close button exits checkout flow
- [ ] Responsive on mobile (375px width)
- [ ] No console errors
- [ ] All API calls use correct keys and parameters

---

## 📋 COMPLETE BUILD CHECKLIST

### Distance Calculation Integration
- [ ] Add `NEXT_PUBLIC_ORS_API_KEY` to `.env.local`
- [ ] Update `/lib/calculateDistance.ts` with `getRoadDistance` function
- [ ] Improve `/lib/matchBricolers.ts` scoring algorithm
- [ ] Update provider card in `/app/order/step2/page.tsx` to show road distance + time

### Checkout Component
- [ ] Create `/lib/checkoutTypes.ts` with TypeScript interfaces
- [ ] Create `/lib/checkoutLogic.ts` with all business logic
- [ ] Create `/app/checkout/page.tsx` main component
- [ ] Create all subcomponents in `/app/checkout/components/`

### API Endpoints
- [ ] Create `/app/api/orders/route.ts` (POST)
- [ ] Create `/app/api/promo-codes/[code]/route.ts` (GET)

### Validation & Error Handling
- [ ] Implement form validation with error messages
- [ ] Add phone number validation for Morocco format
- [ ] Fallback for missing ORS API key
- [ ] Network error handling on order submission

### UI/UX Polish
- [ ] Match Goal design (single column, all sections visible)
- [ ] Remove tabs, use scrollable layout
- [ ] Responsive mobile-first styling
- [ ] Loading states on API calls
- [ ] Success/error notifications

---

## 🎯 KEY IMPLEMENTATION RULES

### Distance & Pricing
1. **Haversine** (`calculateDistance`) — Fast, no API call, used **only** for ranking Bricolers
2. **Road Distance** (`getRoadDistance`) — Real driving distance via OpenRouteService, called **only** for providers shown to user
3. **Never call `getRoadDistance` in loops** — Would exhaust free API tier
4. **Fallback mechanism** — If API key missing or request fails, use haversine estimate + 3 min per km

### Pricing Formula
```
baseFee = max(distanceKm * 2, 5) // 2 MAD per km, min 5 MAD
schedulingPremium = deliveryType === 'scheduled' ? 2 : 0
subtotal = baseFee + schedulingPremium
serviceFee = Math.round(subtotal * 0.10) // 10%
total = subtotal + serviceFee - promoCodeDiscount
```

### Validation Rules
- Pickup & dropoff required with valid lat/lng
- Order description required (not empty)
- Delivery type required (standard or scheduled)
- If scheduled: time must be future, min 30 mins from now
- If sending to someone else: name + phone required, phone must be valid Morocco format
- Payment method required

### State Management
- Single `CheckoutState` object (see `/lib/checkoutTypes.ts`)
- Update state immutably (use previous state + spread operator)
- Recalculate pricing on location or delivery type change
- Validate form on every state change
- Track touched fields for better UX

### Don't Touch These Files
- `/app/order/step1/page.tsx` — Order creation, read-only
- `/components/MapView.tsx` — Separate map, read-only
- Auth, dashboard, other pages — Untouched

---

## 📞 DELIVERABLES

When complete, you will have:

1. ✅ **Real road distance routing** via OpenRouteService API
2. ✅ **Accurate delivery pricing** based on actual driving distance
3. ✅ **Complete checkout flow** with location search, delivery options, promo codes
4. ✅ **Form validation** with clear error messages
5. ✅ **Order submission** with Firebase Firestore backend
6. ✅ **UI matching Goal design** (single column, mobile-optimized)
7. ✅ **Production-ready code** with error handling, loading states, fallbacks

This is a complete, end-to-end feature. Not a mockup. Not partially functional. Fully working, tested, ready for users. 🚀

