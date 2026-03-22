import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields (already done on client, but good practice here)
    if (!body.pickup || !body.dropoff || !body.orderDescription) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Prepare order data
    const orderData = {
      ...body,
      status: 'pending',
      orderNumber: `LB-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'jobs'), orderData);
    
    return NextResponse.json({
      orderId: docRef.id,
      orderNumber: orderData.orderNumber,
      estimatedDeliveryTime: '30-45 minutes'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('API Error /api/orders:', error);
    return NextResponse.json({ message: 'Failed to create order', error: error.message }, { status: 500 });
  }
}
