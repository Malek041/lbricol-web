'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, User, ExternalLink } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import { CheckoutState, PricingData } from '@/lib/checkoutTypes';
import {
  validateCheckout,
  validatePromoCode,
  searchLocations,
  getRoadDistanceAndPrice,
  submitOrder,
} from '@/lib/checkoutLogic';

// Subcomponents
import WarningBanner from './components/WarningBanner';
import LocationSection from './components/LocationSection';
import MapDisplay from './components/MapDisplay';
import RecipientDetails from './components/RecipientDetails';
import DeliveryOptions from './components/DeliveryOptions';
import OrderDescription from './components/OrderDescription';
import PaymentSection from './components/PaymentSection';
import SummaryBox from './components/SummaryBox';
import CheckoutButton from './components/CheckoutButton';
import SplashScreen from '@/components/layout/SplashScreen';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { order, setOrderField } = useOrder();
  const { t, language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'setup' | 'details'>('setup');
  const [isSplashing, setIsSplashing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Initialize state from OrderContext
  const [state, setState] = useState<CheckoutState>({
    pickupLocation: { 
      address: order.location?.address || '', 
      lat: order.location?.lat || null, 
      lng: order.location?.lng || null 
    },
    dropoffLocation: { address: '', lat: null, lng: null },
    sendingToSomeoneElse: false,
    recipientDetails: { name: '', phone: '', address: '' },
    orderDescription: order.description || '',
    deliveryType: 'standard',
    scheduledTime: null,
    paymentMethod: 'cash', // Default to cash for MVP
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
  });

  // ──── SYNC: Update OrderContext when local state changes (important for context-reliant components) ────
  useEffect(() => {
    setOrderField('description', state.orderDescription);
    // Add other fields as needed
  }, [state.orderDescription]);

  // ──── PRICING: Recalculate when distance or delivery type changes ────
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

  // ──── VALIDATION: Re-run when meaningful fields change ────
  useEffect(() => {
    const validation = validateCheckout(state);
    setState(prev => ({
      ...prev,
      isFormValid: validation.valid,
      errors: validation.errors,
    }));
  }, [
    state.pickupLocation, 
    state.dropoffLocation, 
    state.orderDescription, 
    state.deliveryType, 
    state.scheduledTime, 
    state.sendingToSomeoneElse, 
    state.recipientDetails, 
    state.paymentMethod
  ]);

  // ──── HANDLERS ────
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

  const handleSubmitOrder = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    setIsSplashing(true);
    try {
      // Mocking submission for now as /api/orders isn't built yet
      // const result = await submitOrder(state);
      await new Promise(r => setTimeout(r, 2000));
      router.push('/order/success');
    } catch (error: any) {
      setIsSplashing(false);
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: { ...prev.errors, submit: error.message }
      }));
    }
  };

  const handleBack = () => router.back();
  const handleClose = () => router.push('/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', overflow: 'hidden' }}>
      {isSplashing && <SplashScreen subStatus="Finalizing your order..." />}
      
      {/* ── STICKY HEADER ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #F3F4F6',
        }}>
          <button onClick={handleBack} style={{ background: '#F9FAFB', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={22} color="#111827" />
          </button>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#111827' }}>Order Setup</h1>
          <button onClick={handleClose} style={{ background: '#F9FAFB', border: 'none', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={20} color="#111827" />
          </button>
        </div>

        {/* ── STICKY TABS ── */}
        {!(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (
          <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
            {(['setup', 'details'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '16px 0',
                  fontSize: 14,
                  fontWeight: 900,
                  color: activeTab === tab ? '#01A083' : '#9CA3AF',
                  borderBottom: `2px solid ${activeTab === tab ? '#01A083' : 'transparent'}`,
                  background: 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {tab === 'setup' ? 'Order Setup' : 'Bricoler Details'}
              </button>
            ))}
          </div>
        )}

        {/* ── STICKY PROVIDER SECTION ── */}
        {!(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (
          <div style={{
            padding: '16px 20px',
            background: '#fff',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', background: '#F3F4F6', border: '2px solid #fff', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              {order.providerAvatar ? (
                <img src={order.providerAvatar} alt={order.providerName || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="#9CA3AF" />
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Service Provider</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>{order.providerName || 'Bricoler'}</div>
            </div>
            <button 
              onClick={() => setActiveTab('details')}
              style={{ fontSize: 13, fontWeight: 800, color: '#01A083', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
            >
              View Profile <ExternalLink size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <WarningBanner />

              <OrderDescription
                value={state.orderDescription}
                onChange={(v) => setState(prev => ({ ...prev, orderDescription: v }))}
                errors={state.errors}
                serviceType={order.serviceType}
              />

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

              <button 
                onClick={() => setState(prev => ({ ...prev, sendingToSomeoneElse: !prev.sendingToSomeoneElse }))}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#F9FAFB',
                  border: '1px solid #F3F4F6',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 24,
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Sending to someone else?</div>
                <div style={{ width: 44, height: 24, background: state.sendingToSomeoneElse ? '#01A083' : '#E5E7EB', borderRadius: 20, position: 'relative', transition: 'all 0.3s ease' }}>
                  <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: state.sendingToSomeoneElse ? 23 : 3, transition: 'all 0.3s ease' }} />
                </div>
              </button>

              {state.sendingToSomeoneElse && (
                <RecipientDetails
                  details={state.recipientDetails}
                  onChange={(d) => setState(prev => ({ ...prev, recipientDetails: d }))}
                  errors={state.errors}
                />
              )}

              <DeliveryOptions
                deliveryType={state.deliveryType}
                scheduledTime={state.scheduledTime}
                onDeliveryTypeChange={(t) => setState(prev => ({ ...prev, deliveryType: t }))}
                onScheduledTimeChange={(t) => setState(prev => ({ ...prev, scheduledTime: t }))}
                errors={state.errors}
              />

              <PaymentSection
                paymentMethod={state.paymentMethod}
                promoCode={state.promoCode}
                promoCodeValid={state.promoCodeValid}
                isValidating={isValidating}
                onPaymentMethodChange={(m) => setState(prev => ({ ...prev, paymentMethod: m }))}
                onPromoCodeChange={(c) => setState(prev => ({ ...prev, promoCode: c }))}
                onApplyPromoCode={async (c) => {
                  setIsValidating(true);
                  const res = await validatePromoCode(c);
                  setIsValidating(false);
                  if (res.valid) {
                    setState(prev => ({ ...prev, promoCodeValid: true, promoCodeDiscount: res.discount }));
                  } else {
                    setState(prev => ({ ...prev, errors: { ...prev.errors, promoCode: res.message } }));
                  }
                }}
                errors={state.errors}
              />

              <SummaryBox 
                pricing={state.pricing} 
                roadDistance={state.roadDistance} 
                roadDurationMinutes={state.roadDurationMinutes} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <div style={{ padding: '24px', background: '#F9FAFB', borderRadius: '24px', border: '1px solid #F3F4F6' }}>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 12 }}>About {order.providerName}</h3>
                <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, fontWeight: 500 }}>
                  {order.providerBioTranslations?.[language as keyof typeof order.providerBioTranslations] || order.providerBio || t({ en: "This professional provider hasn't added a bio yet, but they are vetted and highly rated by the Lbricol community.", fr: "Ce prestataire professionnel n'a pas encore ajouté de biographie, mais il est vérifié et très bien noté par la communauté Lbricol." })}
                </p>
                <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>★ {order.providerRating || '0.0'}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Rating</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{order.providerJobsCount || '0'}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Jobs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>{order.providerExperience || '1Y'}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase' }}>Exp.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FIX FOOTER: SUBMIT BUTTON ── */}
      <div style={{ padding: '20px', borderTop: '1px solid #F3F4F6', background: '#fff' }}>
        <CheckoutButton
          onClick={handleSubmitOrder}
          disabled={!state.isFormValid || state.isLoading}
          isLoading={state.isLoading}
          label={state.pricing.total > 0 ? `Pay MAD ${state.pricing.total.toFixed(2)}` : 'Pay to order'}
        />
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<SplashScreen subStatus="Loading checkout..." />}>
      <CheckoutContent />
    </Suspense>
  );
}
