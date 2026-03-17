// scripts/migrate-bricoler-location.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Note: Ensure GOOGLE_APPLICATION_CREDENTIALS points to your service account JSON
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
} else {
    // Fallback for local dev if default credentials are available
    initializeApp();
}

const db = getFirestore();

async function migrate() {
  console.log('Starting migration...');
  const snap = await db.collection('bricolers').get();
  const batch = db.batch();
  let count = 0;

  snap.docs.forEach(doc => {
    const data = doc.data();
    const update: any = {};
    if (data.base_lat === undefined)          update.base_lat = null;
    if (data.base_lng === undefined)          update.base_lng = null;
    if (data.service_radius_km === undefined) update.service_radius_km = 10;
    
    if (Object.keys(update).length > 0) {
        batch.update(doc.ref, update);
        count++;
    }
  });

  if (count > 0) {
    await batch.commit();
  }
  console.log(`Done — ${count} out of ${snap.size} bricolers updated`);
}

migrate().catch(console.error);
