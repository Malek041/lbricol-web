import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  if (!code) {
    return NextResponse.json({ message: 'Code required' }, { status: 400 });
  }

  try {
    const q = query(
      collection(db, 'promo_codes'),
      where('code', '==', code.toUpperCase()),
      where('isActive', '==', true),
      limit(1)
    );

    const snap = await getDocs(q);
    
    if (snap.empty) {
      return NextResponse.json({ message: 'Invalid or expired code' }, { status: 404 });
    }

    const data = snap.docs[0].data();
    
    // Check expiration if present
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      return NextResponse.json({ message: 'Code expired' }, { status: 410 });
    }

    return NextResponse.json({
      code: data.code,
      discountAmount: data.discountAmount || 0,
    });

  } catch (error: any) {
    console.error('API Error /api/promo-codes:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
