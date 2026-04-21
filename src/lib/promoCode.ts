import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';

export interface PromoCodeResult {
  valid: boolean;
  type?: 'free_service' | 'discount_percent' | 'discount_fixed';
  serviceId?: string;       // e.g. 'hospitality_turnover' — the specific service that is free
  discountPercent?: number; // e.g. 50 for 50% off
  discountFixed?: number;   // e.g. 100 for 100 MAD off
  description?: string;
  error?: 'not_found' | 'already_used' | 'expired' | 'inactive' | 'server_error';
}

/**
 * Validates a promo code for a given user.
 * Returns the benefit if valid, or an error reason if not.
 * Does NOT mark the code as used — call markPromoCodeUsed() after successful order creation.
 */
export async function validatePromoCode(
  code: string,
  userId?: string
): Promise<PromoCodeResult> {
  try {
    const normalised = code.trim().toUpperCase();
    const ref = doc(db, 'promo_codes', normalised);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { valid: false, error: 'not_found' };
    }

    const data = snap.data();

    if (!data.isActive) {
      return { valid: false, error: 'inactive' };
    }

    // Check expiry
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return { valid: false, error: 'expired' };
    }

    // Check if this specific user already used it
    if (userId && Array.isArray(data.usedBy) && data.usedBy.includes(userId)) {
      return { valid: false, error: 'already_used' };
    }

    // Check global use limit
    const usedCount = Array.isArray(data.usedBy) ? data.usedBy.length : 0;
    if (data.maxUses && usedCount >= data.maxUses) {
      return { valid: false, error: 'expired' };
    }

    return {
      valid: true,
      type: data.type || 'free_service',
      serviceId: data.serviceId,
      discountPercent: data.discountPercent,
      discountFixed: data.discountFixed,
      description: data.description,
    };
  } catch (err) {
    console.error('[validatePromoCode] Error:', err);
    return { valid: false, error: 'server_error' };
  }
}

/**
 * Marks a promo code as used by a user.
 * Call this AFTER the order has been successfully created in Firestore.
 */
export async function markPromoCodeUsed(code: string, userId: string): Promise<void> {
  try {
    const normalised = code.trim().toUpperCase();
    const ref = doc(db, 'promo_codes', normalised);
    await updateDoc(ref, {
      usedBy: arrayUnion(userId),
      lastUsedAt: Timestamp.now(),
    });
  } catch (err) {
    console.error('[markPromoCodeUsed] Error:', err);
  }
}
