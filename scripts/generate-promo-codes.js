/**
 * PROMO CODE GENERATOR — Run once to populate Firestore
 * 
 * Instructions:
 * 1. Install: npm install firebase-admin (run in project root)
 * 2. Download your Firebase service account key:
 *    Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 *    Save it as scripts/serviceAccountKey.json (NEVER commit this file)
 * 3. Run: node scripts/generate-promo-codes.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── Configuration ────────────────────────────────────────────────────────────

const CODES_TO_CREATE = [
  // Instagram giveaway — 10 winners, each gets a unique code
  // These are single-use, giving a FREE hospitality_turnover cleaning
  'LBRICOL-ESS-W1',
  'LBRICOL-ESS-W2',
  'LBRICOL-ESS-W3',
  'LBRICOL-ESS-W4',
  'LBRICOL-ESS-W5',
  'LBRICOL-ESS-W6',
  'LBRICOL-ESS-W7',
  'LBRICOL-ESS-W8',
  'LBRICOL-ESS-W9',
  'LBRICOL-ESS-W10',
];

const CODE_CONFIG = {
  type: 'free_service',
  serviceId: 'hospitality_turnover',         // The specific service that is free
  description: 'Nettoyage hôtelier gratuit — Gagnant concours Instagram Lbricol 🎁',
  isActive: true,
  maxUses: 1,                                // Each code is single-use
  usedBy: [],
  expiresAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-31')), // Adjust date
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  source: 'instagram_giveaway_april_2025',
};

// ─── Create codes ─────────────────────────────────────────────────────────────

async function generateCodes() {
  const batch = db.batch();

  for (const code of CODES_TO_CREATE) {
    const ref = db.collection('promo_codes').doc(code.trim().toUpperCase());
    batch.set(ref, CODE_CONFIG, { merge: false });
    console.log(`✓ Queued: ${code}`);
  }

  await batch.commit();
  console.log(`\n✅ Successfully created ${CODES_TO_CREATE.length} promo codes in Firestore.`);
  console.log('\nCodes to send to winners:');
  CODES_TO_CREATE.forEach(c => console.log(`  → ${c}`));
}

generateCodes().catch(err => {
  console.error('❌ Failed to create codes:', err);
  process.exit(1);
});
