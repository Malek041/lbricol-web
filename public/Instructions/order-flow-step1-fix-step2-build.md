# 🔧 Lbricol — Order Flow: Step 1 Fix + Step 2 Build
# Reference: Image 1 (overview), Image 2 (splash ✅), Image 3 (home ✅)
# Status: Splash ✅ | Home ✅ | Step 1 ⚠️ incomplete | Step 2 ❌ not built

---

## CURRENT STATE SUMMARY

| Screen | Status | Action |
|--------|--------|--------|
| Splash | ✅ Done | Do not touch |
| Home view | ✅ Done | Do not touch |
| Step 1 — Location confirmation | ⚠️ Partially built | Fix bottom sheet only |
| Step 2 — Provider selection | ❌ Not built | Build from scratch |

---

## STEP 1 — Location Confirmation (Fix Bottom Sheet)

### What is already correct ✅
- Map card visible at top with Lbricol yellow pin ✅
- Address card floating top-left of map ("Avenue Allal El Fassi... / Use this point") ✅
- GPS direction button bottom-right of map ✅
- X close button top-left of map ✅
- Map tile style (Carto Voyager, warm beige) ✅

### What needs to be fixed ⚠️

Looking at Image 1 (Step 1 column), the bottom sheet has:

```
┌─────────────────────────────────────────┐
│ 🚲  Flat · Avenue El Aqaba         [✏️] │  ← address row with edit icon
│     zoo, 23, 23                         │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     Confirm This Location         │  │  ← solid green pill button
│  └───────────────────────────────────┘  │
│                                         │
│       Select Another address            │  ← green text link, no border
│                                         │
└─────────────────────────────────────────┘
```

**Fix the bottom sheet content — replace whatever is currently there with:**

```jsx
// Bottom sheet for Step 1
<div style={{
  background: '#fff',
  borderRadius: '20px 20px 0 0',
  padding: '20px 20px 36px',
  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
}}>

  {/* Address row */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  }}>
    {/* Service icon — gray rounded square */}
    <div style={{
      width: 44, height: 44,
      borderRadius: 10,
      background: '#F3F4F6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, flexShrink: 0,
    }}>
      🚲
    </div>

    {/* Address text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 15, fontWeight: 700, color: '#111827',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {addressLabel} · {addressStreet}
        {/* Example: "Flat · Avenue El Aqaba" */}
      </div>
      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
        {addressDetails}
        {/* Example: "zoo, 23, 23" */}
      </div>
    </div>

    {/* Edit icon button */}
    <button style={{
      width: 36, height: 36, borderRadius: '50%',
      border: '1.5px solid #E5E7EB',
      background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0,
    }}>
      {/* Pencil SVG */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  </div>

  {/* Confirm This Location — solid green pill */}
  <button
    onClick={() => navigateToStep2()}
    style={{
      width: '100%',
      height: 54,
      borderRadius: 50,
      background: '#10B981',
      color: '#fff',
      border: 'none',
      fontSize: 16,
      fontWeight: 700,
      cursor: 'pointer',
      marginBottom: 16,
      letterSpacing: 0.2,
    }}
  >
    Confirm This Location
  </button>

  {/* Select Another address — text link */}
  <div
    onClick={() => openLocationPicker()}
    style={{
      textAlign: 'center',
      fontSize: 15,
      fontWeight: 600,
      color: '#10B981',
      cursor: 'pointer',
    }}
  >
    Select Another address
  </div>

</div>
```

**Behavior:**
- "Confirm This Location" → saves location to order context → navigates to Step 2
- "Select Another address" → opens the location picker (View A — full map with saved addresses)
- Edit icon (✏️) → opens Address Details form (View B)
- This step is triggered automatically after user selects a sub-service from the home page

---

## STEP 2 — Provider Selection (Build From Scratch)

### Overall Layout (same persistent split as all flow steps)

```
┌─────────────────────────────────────────┐  height: 40vh
│              MAP CARD                   │
│  [address card top-left]                │
│  [yellow Lbricol pins — all providers]  │
│  [selected provider: avatar pin]        │
│  [GPS button bottom-right]              │
├─────────────────────────────────────────┤  height: 60vh
│         BOTTOM SHEET                    │
│  [provider cards — scrollable]          │
│  [back ←]  [no Next button this step]   │
└─────────────────────────────────────────┘
```

### Map Card — Step 2 Specific Behavior

**Yellow provider pins (from Image 1, Step 2 column):**

Each available provider has a custom pin on the map showing their price and rating:

```
Pin structure (per provider):
┌──────────────┐
│  80 MAD      │  ← price label, white card, rounded
│  ★ 3.5       │  ← star rating
└──────┬───────┘
       │
    [avatar]       ← circular provider photo inside yellow teardrop
       │
      ╱╲            ← pin tail
```

**Implement each provider pin as a Leaflet divIcon:**

```javascript
function createProviderPin(provider, isSelected = false) {
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
      ${!isSelected ? `
        <!-- Price + rating card (shown on unselected pins) -->
        <div style="
          background:white;
          border-radius:8px;
          padding:4px 8px;
          margin-bottom:4px;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
          font-family:sans-serif;
          white-space:nowrap;
          text-align:center;
        ">
          <div style="font-size:12px;font-weight:700;color:#111827">${provider.minRate} MAD</div>
          <div style="font-size:11px;color:#F59E0B">★ ${provider.rating.toFixed(1)}</div>
        </div>
      ` : ''}

      <!-- Avatar inside yellow teardrop -->
      <div style="position:relative;width:${isSelected ? 56 : 44}px">
        <svg viewBox="0 0 44 58" fill="none" width="${isSelected ? 56 : 44}" height="${isSelected ? 74 : 58}">
          <path d="M22 0C10.4 0 1 9.4 1 21C1 36.5 22 58 22 58C22 58 43 36.5 43 21C43 9.4 33.6 0 22 0Z"
                fill="${isSelected ? '#F59E0B' : '#FBBF24'}"/>
        </svg>
        <!-- Circular avatar image clipped inside -->
        <div style="
          position:absolute;
          top:4px; left:50%; transform:translateX(-50%);
          width:${isSelected ? 38 : 30}px;
          height:${isSelected ? 38 : 30}px;
          border-radius:50%;
          overflow:hidden;
          border:2px solid white;
        ">
          <img src="${provider.avatarUrl || '/Images/default-avatar.png'}"
               style="width:100%;height:100%;object-fit:cover"/>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '',
    iconSize: [isSelected ? 56 : 44, isSelected ? 74 : 80],
    iconAnchor: [isSelected ? 28 : 22, isSelected ? 74 : 80],
  });
}

// Add all provider pins to map:
providers.forEach(provider => {
  const marker = L.marker([provider.lat, provider.lng], {
    icon: createProviderPin(provider, false)
  }).addTo(map);

  marker.on('click', () => {
    setSelectedProvider(provider);
    // Scroll bottom sheet to this provider's card
    scrollToCard(provider.id);
    // Update all pins: selected gets larger, others get smaller
    updateAllPins(provider.id);
    // Pan map to selected provider
    map.panTo([provider.lat, provider.lng], { animate: true, duration: 0.5 });
  });

  providerMarkers[provider.id] = marker;
});

// When a provider is selected, zoom map to fit both
// the user location pin and the selected provider pin:
function onProviderSelected(provider) {
  const bounds = L.latLngBounds([
    [userLat, userLng],
    [provider.lat, provider.lng]
  ]);
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
}
```

**Address card in Step 2 (from Image 1):**
```
Text: "Avenue Allal El Fassi الفاسي ... / Use this point →"
// Same as Step 1 — "Use this point" (not "Define another Address")
// Because user is still potentially in location-picking mode
```

---

### Bottom Sheet — Provider Cards

**Title:**
```jsx
<h2 style={{
  fontSize: 22, fontWeight: 800, color: '#111827',
  margin: '0 0 20px 0', letterSpacing: -0.3,
}}>
  Find your Tasker
</h2>
```

**Provider card (from Image 1, Step 2 column — detailed view):**

```jsx
function ProviderCard({ provider, isSelected, onSelect }) {
  return (
    <div
      id={`provider-${provider.id}`}
      style={{
        border: isSelected ? '2px solid #10B981' : '1px solid #F3F4F6',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        background: '#fff',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Top row: avatar + name/price + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>

        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          overflow: 'hidden', flexShrink: 0,
          background: '#F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: '#6B7280',
        }}>
          {provider.avatarUrl
            ? <img src={provider.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : provider.name.charAt(0).toUpperCase()
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {provider.name}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
              MAD {provider.minRate}
              <span style={{ color: '#9CA3AF', fontWeight: 400 }}> (min)</span>
              {' '}
              <span style={{ color: '#10B981' }}>✓</span>
            </span>
          </div>

          {/* NEW badge */}
          {provider.isNew && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#EEF2FF', color: '#6366F1',
              fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 50,
              marginTop: 4,
            }}>
              ✦ NEW
            </span>
          )}

          {/* Rating + availability row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 6,
          }}>
            <span style={{ fontSize: 13, color: '#374151' }}>
              ★ {provider.rating.toFixed(1)}
            </span>
            {provider.availableToday && (
              <span style={{
                background: '#F0FDF4', color: '#10B981',
                fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 50,
                border: '1px solid #A7F3D0',
              }}>
                ● AVAILABLE TODAY
              </span>
            )}
          </div>

          {/* Task count */}
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
            ⏱ {provider.taskCount} {serviceType} tasks
          </div>
        </div>
      </div>

      {/* Bio */}
      <p style={{
        fontSize: 13, color: '#374151', lineHeight: 1.55,
        marginBottom: 8,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {provider.bio}
      </p>
      <button style={{
        color: '#10B981', fontSize: 13, fontWeight: 600,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, marginBottom: 12,
      }}>
        Read More
      </button>

      {/* Select & Continue button */}
      <button
        onClick={() => onSelect(provider)}
        style={{
          width: '100%', height: 48,
          borderRadius: 50,
          background: '#10B981', color: '#fff',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: 0.2,
        }}
      >
        Select & Continue
      </button>
    </div>
  );
}
```

**"Select & Continue" behavior:**
- Saves selected provider to order context
- Highlights their pin on map (larger, yellow selected state)
- Navigates to Step 3 (Date & Time picker)

---

### Bottom Navigation for Step 2

```jsx
// Step 2 only has a BACK button — no Next button
// "Select & Continue" inside each card serves as the forward action

<div style={{
  position: 'sticky', bottom: 0,
  background: '#fff',
  padding: '12px 20px 28px',
  borderTop: '1px solid #F3F4F6',
}}>
  <button
    onClick={() => navigateToStep1()}
    style={{
      width: 48, height: 48,
      borderRadius: '50%',
      background: '#F3F4F6',
      border: 'none', fontSize: 20,
      cursor: 'pointer',
    }}
  >
    ‹
  </button>
</div>
```

---

## DATA — Firestore Query for Available Providers

```typescript
// Fetch providers for Step 2
// Filter by: service type + city + isActive + isVerified

async function fetchAvailableProviders(serviceType: string, city: string) {
  const q = query(
    collection(db, 'bricolers'),
    where('services', 'array-contains', serviceType),
    where('city', '==', city),
    where('isActive', '==', true),
    where('isVerified', '==', true),
    orderBy('rating', 'desc'),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
```

Each provider document must have:
```typescript
{
  name: string,
  avatarUrl: string,           // Cloudinary URL
  minRate: number,             // e.g. 80 (MAD)
  rating: number,              // e.g. 3.5
  taskCount: number,
  bio: string,
  isNew: boolean,
  availableToday: boolean,
  isActive: boolean,
  isVerified: boolean,
  services: string[],          // e.g. ['babysitting', 'childcare']
  city: string,                // e.g. 'Essaouira'
  lat: number,                 // provider's location
  lng: number,
}
```

---

## NAVIGATION FLOW — Complete Order

```
Home page
  → user taps service category + sub-service
  → Step 1: Location Confirmation
      → "Confirm This Location" → Step 2
      → "Select Another address" → Location Picker (View A)
      → Edit icon → Address Details (View B)
  → Step 2: Provider Selection
      → "Select & Continue" on a card → Step 3
      → Back ← → Step 1
  → Step 3: Date & Time (already specced in previous doc)
      → "Next Step" → Checkout / Summary
      → Back ← → Step 2
```

---

## IMPORTANT NOTES FOR AGENT

1. **Step 1 trigger**: Step 1 opens automatically when user taps a sub-service pill on the home page. It does NOT open from a separate "Book now" button.

2. **Order context**: Use React Context or Zustand to store order state across steps:
   ```typescript
   {
     serviceType: string,
     subService: string,
     location: { lat, lng, address, label },
     selectedProvider: Provider | null,
     selectedDate: string | null,
     selectedTime: string | null,
   }
   ```

3. **Map persistence**: The map component should NOT unmount between steps. Use a single persistent MapCard component that receives different props per step. This prevents re-initializing Leaflet on every step transition.

4. **Yellow pins lifecycle**:
   - Step 1: NO yellow provider pins on map
   - Step 2: ALL available provider pins shown
   - Step 3+: Only selected provider's pin remains

5. **Provider pin scroll sync**: When user scrolls provider cards in bottom sheet, the visible provider card should highlight its corresponding map pin. Use IntersectionObserver on each card.

6. **Empty state**: If no providers available in the user's city, show:
   ```
   😔 No Bricolers available in your area yet.
   We're expanding soon — check back shortly!
   [Notify me when available]  ← button saves email/push subscription
   ```
