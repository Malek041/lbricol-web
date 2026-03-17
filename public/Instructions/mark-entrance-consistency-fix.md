# 🔧 "Mark Your Entrance" — Consistency Fix
# Current state (Image 2) vs Expected (Images 1 + 3)
# The entrance map must match the exact same style as the main location picker

---

## CONTEXT

The "Mark your entrance" feature has TWO states:

**State A — Snapshot inside Address Details form (Image 2)**
A small static map thumbnail inside the form showing where the pin was placed.

**State B — Full-screen entrance picker (Image 3)**
A full-screen interactive map where user drags to pinpoint their entrance exactly.

Both must use the EXACT same visual language as the main location picker already built.

---

## STATE A — Map Snapshot (inside Address Details form)

### What is wrong now (Image 2):
- Map snapshot uses a **standard green Leaflet teardrop pin** (default Leaflet marker)
- This is inconsistent — the rest of the app uses the custom Lbricol yellow pin

### What it must look like:
- Same map tile style: Carto Voyager (`rastertiles/voyager`)
- Same zoom level: **16** (street level, not zoomed out)
- Pin inside snapshot: **Lbricol yellow pin** (the same custom yellow teardrop with the logo mark)
- Map snapshot is non-interactive (no drag, no zoom) — static display only
- Rounded corners: `border-radius: 12px`
- Size: full width of form, height ~160px

### Fix:
```typescript
// When initializing the snapshot map:
const snapshotMap = L.map(snapshotRef.current, {
  dragging: false,          // ← static, no interaction
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  keyboard: false,
});

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  { subdomains: 'abcd', maxZoom: 19 }
).addTo(snapshotMap);

snapshotMap.setView([entranceLat, entranceLng], 16);  // zoom 16, not lower

// Use Lbricol yellow pin — same divIcon as used everywhere else in the app
const lbricolPin = L.divIcon({
  html: `<img src="/Images/map Assets/locationPinYellowOnly.png"
              style="width:36px;height:48px;transform:translate(-50%,-100%)"/>`,
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

L.marker([entranceLat, entranceLng], { icon: lbricolPin }).addTo(snapshotMap);
```

---

## STATE B — Full-Screen Entrance Picker (Image 3)

### What is wrong now (Image 3):
- Pin is the **Glovo-style dark green teardrop** (wrong — should be Lbricol yellow)
- Map tiles look correct (Carto Voyager ✅) but zoom is too low (~13) — city level visible
- Address card at top shows "Point to the entrance" instruction card — this is correct ✅
- "Confirm entrance" button at bottom — correct ✅ but should be disabled until user drags

### What it must look like:
- **Pin**: Lbricol yellow teardrop pin (same as everywhere else)
  ```
  /Images/map Assets/locationPinYellowOnly.png
  ```
- **Pin behavior**: Fixed CSS center pin — map moves underneath (same as main picker)
- **Zoom**: 16–17 (street level, 3–4 blocks visible) — NOT zoomed out to city level
- **Map tiles**: Carto Voyager ✅ (already correct — keep this)
- **Instruction card** (top of map): Keep as-is ✅
- **"Confirm entrance" button**: 
  - Disabled (gray) on first open
  - Activates (green) only after user drags the map at least once
  - Same pill style as other CTA buttons

### Fix — pin and zoom:
```typescript
// Full-screen entrance picker map init:
const entranceMap = L.map(entranceMapRef.current, {
  zoomControl: false,
  attributionControl: false,
});

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  { subdomains: 'abcd', maxZoom: 19 }
).addTo(entranceMap);

// ← Start at zoom 17, not 13
entranceMap.setView([addressLat, addressLng], 17);

// ← Fixed CSS pin (map moves underneath — same pattern as main picker)
// The yellow pin is an absolutely positioned element OVER the map div:
```

```jsx
{/* Entrance picker layout */}
<div style={{ position: 'relative', height: '100vh' }}>

  {/* Map fills full screen */}
  <div ref={entranceMapRef} style={{ width: '100%', height: '100%' }} />

  {/* Fixed Lbricol yellow pin — CSS centered, does not move */}
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -100%)',
    zIndex: 500,
    pointerEvents: 'none',
  }}>
    <img
      src="/Images/map Assets/locationPinYellowOnly.png"
      style={{ width: 40, height: 54 }}
      alt="entrance pin"
    />
  </div>

  {/* Instruction card — top */}
  <div style={{
    position: 'absolute', top: 16, left: 16, right: 16, zIndex: 900,
    background: '#fff', borderRadius: 16, padding: '14px 16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <span style={{ fontSize: 32 }}>📦</span>
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
        Point to the entrance
      </div>
      <div style={{ fontSize: 13, color: '#6B7280' }}>
        This helps the Bricoler to reach you faster
      </div>
    </div>
  </div>

  {/* Back button — top left */}
  <button style={{
    position: 'absolute', top: 16, left: 16, zIndex: 1000,
    width: 40, height: 40, borderRadius: '50%',
    background: '#fff', border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    cursor: 'pointer', fontSize: 18,
  }}>
    ←
  </button>

  {/* Confirm entrance button — bottom */}
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 900,
    padding: '16px 20px 32px',
    background: 'linear-gradient(to top, rgba(255,255,255,1) 70%, transparent)',
  }}>
    <button
      onClick={hasMovedMap ? confirmEntrance : undefined}
      style={{
        width: '100%', height: 54,
        borderRadius: 50,
        background: hasMovedMap ? '#10B981' : '#D1D5DB',
        color: hasMovedMap ? '#fff' : '#9CA3AF',
        border: 'none', fontSize: 16, fontWeight: 700,
        cursor: hasMovedMap ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s ease',
      }}
    >
      Confirm entrance
    </button>
  </div>
</div>
```

```typescript
// Detect first drag to activate the button:
let hasMovedMap = false;

entranceMap.on('movestart', () => {
  if (!hasMovedMap) {
    hasMovedMap = true;
    setHasMoved(true);  // React state to re-render button
  }
});

// On confirm: read map center as entrance coordinates
entranceMap.on('moveend', () => {
  const center = entranceMap.getCenter();
  setEntranceLat(center.lat);
  setEntranceLng(center.lng);
});
```

---

## COMPLETE FLOW (for agent reference)

```
Address Details form (View B)
  ↓ user sees map snapshot with Lbricol pin (State A)
  ↓ user TAPS the snapshot
  → Full-screen entrance picker opens (State B)
      - Lbricol yellow pin fixed at center
      - Map starts at saved address coordinates, zoom 17
      - "Confirm entrance" button disabled (gray)
      ↓ user drags map to pinpoint entrance
      → button activates (green)
      ↓ user taps "Confirm entrance"
  → Returns to Address Details form (View B)
      - Snapshot now shows Lbricol pin at the NEW entrance location
      - "Mark your entrance" section shows: ✅ Done! Thanks for helping
```

---

## SUMMARY — EXACTLY WHAT TO CHANGE

| Element | Current (Wrong) | Fix |
|---------|----------------|-----|
| Snapshot map tile | Unknown/default | Carto Voyager |
| Snapshot pin | Green Leaflet default marker | Lbricol yellow pin image |
| Snapshot zoom | Too low (city level) | Zoom 16 |
| Entrance picker pin | Dark green teardrop SVG | Lbricol yellow pin image |
| Entrance picker zoom | ~13 (too far out) | Zoom 17 |
| "Confirm entrance" button | Always clickable | Disabled until first map drag |

## DO NOT CHANGE
- Instruction card text and layout ✅
- "Confirm entrance" button position and size ✅  
- Address Details form fields ✅
- Label pills (Home, Flat, Garden, Custom) ✅
- "Save address" button ✅
- Back arrow behavior ✅
