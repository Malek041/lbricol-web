# Lbricol.com — Image Storage & Firebase Migration
### Full Implementation Spec for IDE Agent

---

## PART 1 — Storage Architecture Decision

### Why Cloudinary + Firebase Storage (not Firebase Storage alone)

Given the 7 image types needed for Lbricol, using Firebase Storage alone has critical limitations:

| Concern | Firebase Storage Only | Cloudinary + Firebase Storage |
|---|---|---|
| Auto image compression | ❌ None — 8MB photo stays 8MB | ✅ Auto-compress on upload |
| Thumbnail generation | ❌ Manual Cloud Function needed | ✅ Free via URL transformation |
| ID doc privacy | ⚠️ Requires careful rules | ✅ Firebase Storage (private rules) |
| CDN delivery speed | ⚠️ Limited CDN regions | ✅ Global CDN, fast in Morocco |
| Free tier | 5GB storage only | 25GB storage + 25GB bandwidth |
| Next.js integration | ✅ Native | ✅ next-cloudinary package |
| Chat photos delivery | ⚠️ Slow without CDN | ✅ Fast CDN optimized per device |

### Final Decision

> Use **Cloudinary** for: profile photos, portfolio photos, service completion photos, client request photos, chat photos.
> Use **Firebase Storage** (private) for: ID verification documents only.
> Keep **Firebase Auth + Firestore** for: all user data, metadata, URLs.

---

## PART 2 — Cloudinary Folder & Naming Structure

Organize all Cloudinary uploads under the following folder hierarchy. The folder structure maps directly to image type and ownership.

**User Profile Photos**
```
lbricol/users/{userId}/avatar
```
One image per user. On re-upload, overwrite using `public_id` so old image is replaced automatically.

**Bricoler (Provider) Profile Photos**
```
lbricol/bricolers/{bricolerId}/avatar
```
Same pattern as users. One avatar, overwritten on update.

**Bricoler Portfolio Photos**
```
lbricol/bricolers/{bricolerId}/portfolio/{imageId}
```
Multiple images allowed. `imageId` = Firestore auto-generated ID. Store up to 10 portfolio images per Bricoler.

**Service Completion Photos**
```
lbricol/orders/{orderId}/completion/{imageId}
```
Uploaded by Bricoler after completing a job. Linked to an order document in Firestore.

**Client Request Photos (what they need help with)**
```
lbricol/orders/{orderId}/request/{imageId}
```
Uploaded by client when creating a service request. Multiple photos allowed per order.

**In-App Chat Photos**
```
lbricol/chats/{chatId}/{messageId}
```
One image per chat message. `messageId` = Firestore auto-generated ID of the message document.

---

## PART 3 — Firebase Storage: ID Verification Documents

### Folder Structure (Firebase Storage)
```
verification/{bricolerId}/id-front.jpg
verification/{bricolerId}/id-back.jpg
verification/{bricolerId}/selfie.jpg
```

### Security Rules

Add these rules to your Firebase Storage security rules. ID docs are **NEVER** public — only the owner or an admin can read them.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ID verification — private, owner + admin only
    match /verification/{bricolerId}/{document} {
      allow read: if request.auth != null &&
        (request.auth.uid == bricolerId || request.auth.token.admin == true);
      allow write: if request.auth != null &&
        request.auth.uid == bricolerId &&
        request.resource.size < 10 * 1024 * 1024 &&
        request.resource.contentType.matches('image/.*');
    }
    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## PART 4 — Required Packages & Setup

### Install Packages
```bash
npm install cloudinary next-cloudinary
# firebase is already installed
```

### Environment Variables

Add to your `.env.local` file (never commit this file):
```
# Cloudinary (get from cloudinary.com dashboard)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase (already have these)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
```

### Cloudinary Config File

Create `/lib/cloudinary.ts`:
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;
```

---

## PART 5 — Upload Implementation Per Image Type

### 1. Profile & Avatar Photos (Users + Bricolers)

Use the `CldUploadWidget` from `next-cloudinary`. On upload success, save the returned URL to Firestore.

```typescript
// components/AvatarUpload.tsx
import { CldUploadWidget } from 'next-cloudinary';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function AvatarUpload({ userId, userType }) {
  const folder = userType === 'bricoler'
    ? `lbricol/bricolers/${userId}`
    : `lbricol/users/${userId}`;

  const handleUpload = async (result) => {
    const url = result.info.secure_url;
    const ref = doc(db, userType === 'bricoler' ? 'bricolers' : 'users', userId);
    await updateDoc(ref, {
      avatarUrl: url,
      avatarUpdatedAt: new Date()
    });
  };

  return (
    <CldUploadWidget
      uploadPreset="lbricol_avatars" // create this preset in Cloudinary dashboard
      options={{
        folder,
        maxFiles: 1,
        cropping: true,
        croppingAspectRatio: 1,
        maxFileSize: 5000000,
        clientAllowedFormats: ['jpg', 'png', 'webp']
      }}
      onSuccess={handleUpload}
    >
      {({ open }) => <button onClick={open}>Upload Photo</button>}
    </CldUploadWidget>
  );
}
```

### 2. Bricoler Portfolio Photos

```typescript
// options for portfolio upload widget:
{
  folder: `lbricol/bricolers/${bricolerId}/portfolio`,
  maxFiles: 10,
  multiple: true,
  maxFileSize: 8000000,
  clientAllowedFormats: ['jpg', 'png', 'webp'],
}

// On each upload success, add to Firestore array:
await updateDoc(bricolerRef, {
  portfolio: arrayUnion({
    url: result.info.secure_url,
    publicId: result.info.public_id,
    uploadedAt: new Date(),
  })
});
```

### 3. Chat Photos

```typescript
// Upload chat photo, then create message doc with image URL
const handleChatPhotoUpload = async (result, chatId) => {
  const imageUrl = result.info.secure_url;
  const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
  await setDoc(msgRef, {
    type: 'image',
    imageUrl,
    senderId: currentUser.uid,
    createdAt: serverTimestamp(),
  });
};

// Widget options:
{
  folder: `lbricol/chats/${chatId}`,
  maxFiles: 1,
  maxFileSize: 10000000,
  clientAllowedFormats: ['jpg', 'png', 'webp', 'gif'],
}
```

### 4. ID Verification Documents (Firebase Storage — private)

```typescript
// lib/uploadIdDoc.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function uploadIdDocument(
  bricolerId: string,
  side: 'front' | 'back' | 'selfie',
  file: File
) {
  const storage = getStorage();
  const storageRef = ref(storage, `verification/${bricolerId}/id-${side}.jpg`);
  await uploadBytes(storageRef, file, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(storageRef);

  // Store URL in Firestore (only accessible server-side or with auth)
  await updateDoc(doc(db, 'bricolers', bricolerId), {
    [`verification.${side}Url`]: url,
    [`verification.${side}UploadedAt`]: new Date(),
    'verification.status': 'pending_review',
  });

  return url;
}
```

---

## PART 6 — Firestore Document Schema Updates

### users collection — add image fields
```typescript
// users/{userId}
{
  // ... existing fields ...
  avatarUrl: string,        // Cloudinary URL
  avatarPublicId: string,   // Cloudinary public_id (for deletion)
  avatarUpdatedAt: Timestamp,
}
```

### bricolers collection — add image fields
```typescript
// bricolers/{bricolerId}
{
  // ... existing fields ...
  avatarUrl: string,
  avatarPublicId: string,
  portfolio: [
    { url: string, publicId: string, uploadedAt: Timestamp }
  ],
  verification: {
    frontUrl: string,       // Firebase Storage URL (private)
    backUrl: string,
    selfieUrl: string,
    status: 'pending' | 'pending_review' | 'approved' | 'rejected',
    submittedAt: Timestamp,
    reviewedAt: Timestamp,
    reviewedBy: string,     // admin uid
  }
}
```

### orders collection — add image fields
```typescript
// orders/{orderId}
{
  // ... existing fields ...
  requestPhotos: [
    { url: string, publicId: string, uploadedAt: Timestamp, uploadedBy: string }
  ],
  completionPhotos: [
    { url: string, publicId: string, uploadedAt: Timestamp, uploadedBy: string }
  ],
}
```

### chats / messages — add image fields
```typescript
// chats/{chatId}/messages/{messageId}
{
  type: 'text' | 'image',
  text: string,         // if type === 'text'
  imageUrl: string,     // if type === 'image' — Cloudinary URL
  imagePublicId: string,
  senderId: string,
  createdAt: Timestamp,
  readBy: string[],
}
```

---

## PART 7 — Firebase Migration Plan

### What needs to be migrated

Since you already have data in Firebase with no images stored yet, migration is straightforward. No image files need to be moved — only the Firestore document structure needs to be updated to support the new image fields.

| Collection | Migration Action | Risk | Script Needed? |
|---|---|---|---|
| users | Add `avatarUrl: null` to all existing docs | Zero — additive only | Yes — batch update |
| bricolers | Add `avatarUrl`, `portfolio: []`, `verification: {}` to all existing docs | Zero — additive only | Yes — batch update |
| orders | Add `requestPhotos: []`, `completionPhotos: []` to all existing docs | Zero — additive only | Yes — batch update |
| chats/messages | Add `type: "text"` to all existing message docs without type field | Low — existing messages have no images | Yes — batch update |
| Firebase Auth | No changes needed | None | No |

### Migration Script

Run this script **ONCE** from your local machine or a Node.js script. It is safe to run multiple times (idempotent).

```typescript
// scripts/migrate-image-fields.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Run with: npx ts-node scripts/migrate-image-fields.ts
// Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON

const app = initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
const db = getFirestore(app);

async function migrate() {
  console.log('Starting migration...');

  // 1. Update users
  const users = await db.collection('users').get();
  const userBatch = db.batch();
  users.docs.forEach(d => {
    if (!d.data().avatarUrl) {
      userBatch.update(d.ref, { avatarUrl: null, avatarPublicId: null });
    }
  });
  await userBatch.commit();
  console.log(`Updated ${users.size} users`);

  // 2. Update bricolers
  const bricolers = await db.collection('bricolers').get();
  const bBatch = db.batch();
  bricolers.docs.forEach(d => {
    const data = d.data();
    const update: any = {};
    if (!data.avatarUrl) update.avatarUrl = null;
    if (!data.portfolio) update.portfolio = [];
    if (!data.verification) update.verification = { status: 'not_submitted' };
    if (Object.keys(update).length > 0) bBatch.update(d.ref, update);
  });
  await bBatch.commit();
  console.log(`Updated ${bricolers.size} bricolers`);

  // 3. Update orders
  const orders = await db.collection('orders').get();
  const oBatch = db.batch();
  orders.docs.forEach(d => {
    const data = d.data();
    const update: any = {};
    if (!data.requestPhotos) update.requestPhotos = [];
    if (!data.completionPhotos) update.completionPhotos = [];
    if (Object.keys(update).length > 0) oBatch.update(d.ref, update);
  });
  await oBatch.commit();
  console.log(`Updated ${orders.size} orders`);

  // 4. Update chat messages — add type field
  const chats = await db.collection('chats').get();
  for (const chat of chats.docs) {
    const msgs = await chat.ref.collection('messages').where('type', '==', null).get();
    if (msgs.empty) continue;
    const mBatch = db.batch();
    msgs.docs.forEach(m => {
      if (!m.data().type) mBatch.update(m.ref, { type: 'text' });
    });
    await mBatch.commit();
  }
  console.log('Updated chat messages');
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

### How to run the migration

1. **Download your Firebase service account JSON:** Firebase Console → Project Settings → Service accounts → Generate new private key
2. **Set environment variable:** `export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"`
3. **Run the script:** `npx ts-node scripts/migrate-image-fields.ts`
4. **Verify in Firebase Console:** Check a few documents in each collection to confirm new fields were added
5. **Deploy your updated security rules:** `firebase deploy --only storage`

---

## PART 8 — Cloudinary Upload Presets to Create

Create these presets in your Cloudinary dashboard (Settings → Upload → Upload presets → Add upload preset):

| Preset Name | Signing Mode | Max File Size | Transformations | Used For |
|---|---|---|---|---|
| lbricol_avatars | Unsigned | 5MB | Auto-crop square, resize 400×400, auto quality | User + Bricoler profile photos |
| lbricol_portfolio | Unsigned | 8MB | Resize max 1200px, auto quality/format | Bricoler portfolio photos |
| lbricol_orders | Unsigned | 10MB | Resize max 1600px, auto quality | Completion + request photos |
| lbricol_chat | Unsigned | 10MB | Resize max 1200px, auto quality/format | In-app chat photos |

> **Important:** Unsigned presets allow direct browser uploads without exposing your API secret. For ID documents (Firebase Storage), you upload server-side only — never directly from the browser.

---

## PART 9 — Displaying Images in the App

### Use CldImage for Cloudinary images (optimized delivery)

```typescript
// Always use CldImage instead of <img> for Cloudinary URLs
import { CldImage } from 'next-cloudinary';

// Avatar
<CldImage
  src={user.avatarUrl}  // Cloudinary public_id or full URL
  width={80}
  height={80}
  crop="fill"
  gravity="face"
  alt={user.name}
  style={{ borderRadius: '50%' }}
/>

// Portfolio thumbnail
<CldImage
  src={photo.publicId}
  width={200}
  height={200}
  crop="fill"
  alt="Portfolio photo"
  style={{ borderRadius: 12 }}
/>
```

### Fallback avatar when no photo uploaded

```typescript
// components/Avatar.tsx
export function Avatar({ user, size = 48 }) {
  if (user.avatarUrl) {
    return (
      <CldImage
        src={user.avatarUrl}
        width={size}
        height={size}
        crop="fill"
        gravity="face"
        alt={user.name}
        style={{ borderRadius: '50%', width: size, height: size }}
      />
    );
  }

  // Fallback: initials avatar
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: '#D1FAE5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#065F46'
    }}>
      {user.name?.charAt(0).toUpperCase()}
    </div>
  );
}
```

---

## SUMMARY — Implementation Checklist for Agent

- [ ] 1. Create Cloudinary account → get cloud name, API key, API secret
- [ ] 2. Create 4 upload presets in Cloudinary dashboard (`lbricol_avatars`, `lbricol_portfolio`, `lbricol_orders`, `lbricol_chat`)
- [ ] 3. Add all environment variables to `.env.local`
- [ ] 4. `npm install cloudinary next-cloudinary`
- [ ] 5. Create `/lib/cloudinary.ts` config file
- [ ] 6. Update Firebase Storage security rules and deploy
- [ ] 7. Run migration script to add image fields to existing Firestore documents
- [ ] 8. Build `AvatarUpload` component (users + bricolers)
- [ ] 9. Build portfolio upload for Bricoler profiles
- [ ] 10. Build order photo upload (request + completion)
- [ ] 11. Build chat photo upload using `uploadIdDoc` pattern
- [ ] 12. Build ID document upload (Firebase Storage, server-side only)
- [ ] 13. Replace all `<img>` tags with `<CldImage>` for Cloudinary images
- [ ] 14. Build `Avatar` component with initials fallback
