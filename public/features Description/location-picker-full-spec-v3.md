# 🗺️ Location Picker — Full Behavioral & UI Specification
# Based on Glovo reference screenshots vs current build
# For: Lbricol Next.js app

---

## OVERVIEW OF THE COMPLETE FLOW

The location picker is NOT a single screen. It is a **multi-screen flow** with 4 distinct views:

```
[App Opens] 
    → Request GPS permission (system dialog)
    → Home screen with "Home ▾" button at top
    → Tap "Home ▾" → Map screen with saved addresses bottom sheet (View A)
    → Tap address row edit icon → Address Details form (View B)
    → Tap "Add a new address" → Search screen (View C) → Address Details form (View B)
```

Build each view as a separate screen/component. Do not combine them.

---

## VIEW A — Map + Saved Addresses Bottom Sheet

### Map Section (top ~48% of screen)

**Map tile style:**
- Use Carto Voyager tiles — warm beige/cream buildings, subtle yellow major roads, light blue water, light green parks
- Tile URL: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- This is NOT the gray/washed out style. Voyager has warm tones, visible contrast, readable labels.
- Reference: Image 3 and Image 6 both show this warm beige style clearly

**Map zoom level:**
- Default zoom: **16** (not 15, not 14 — zoom 16 shows ~3–4 city blocks, streets clearly readable)
- When GPS locates user: fly to zoom **17** (very close, user's street fills screen)
- This is MUCH more zoomed in than what the agent built (Image 6 shows city-wide view — wrong)

**Center-pin behavior:**
- Pin is FIXED absolutely at center of screen using CSS
- Map moves underneath the pin
- On map `moveend` event: fire reverse geocode with `map.getCenter()`
- Debounce: 800ms

**Pin design (from Image 3 and Image 6):**
```
Shape: Teardrop / classic location pin
- Head: large filled dark teal circle (#0D6B52 approximately)
- Inner dot: white circle, centered in head, ~30% of head diameter
- Tail: narrow pointed bottom (classic pin teardrop, NOT a separate triangle CSS trick)
- Size: head ~44px diameter, total height ~58px
- Shadow: drop-shadow(0 4px 10px rgba(0,0,0,0.3))
- The BLUE DOT below the pin (visible in Image 3): this is the GPS accuracy circle 
  rendered as a separate Leaflet circleMarker at user's actual GPS position
  Style: fillColor #4A90D9, radius 6, white border 2px, fillOpacity 1
```

**Implement pin as inline SVG — exact shape:**
```jsx
// Fixed pin — CSS absolute center of map container
<div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -100%)',
  zIndex: 500,
  pointerEvents: 'none',
  filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))',
}}>
  <svg width="44" height="58" viewBox="0 0 44 58" fill="none">
    {/* Teardrop body */}
    <path
      d="M22 0C10.4 0 1 9.4 1 21C1 36.5 22 58 22 58C22 58 43 36.5 43 21C43 9.4 33.6 0 22 0Z"
      fill="#0D6B52"
    />
    {/* White inner dot */}
    <circle cx="22" cy="21" r="8" fill="white" />
  </svg>
</div>
```

**X (close) button:**
- Top-left of map, NOT inside search bar
- Size: 36×36px white circle with shadow
- Position: absolute, top: 16px, left: 16px, zIndex: 1000
- Icon: × in dark gray (#374151), font-size 18px

**GPS crosshair button:**
- Bottom-right of map section, NOT overlapping bottom sheet
- Position: absolute, bottom: 16px (relative to map area), right: 16px
- Size: 44×44px white circle, shadow
- Icon: SVG crosshair (circle + 4 lines)
- On tap: `map.flyTo(userLatLng, 17, { duration: 1.5 })` — SLOW animated fly, 1.5 seconds
- Show spinner inside button while GPS is fetching

**Address card (floats on map, NOT in bottom sheet):**
- Position: absolute, top: 16px, left: 72px (to the right of X button), right: 16px
- Background: white, border-radius: 14px, padding: 12px 16px
- Shadow: `0 2px 12px rgba(0,0,0,0.12)`
- Left icon: gray circle 38×38px, service icon inside (🚲 for move-in)
- Address text: 15px, font-weight: 700, color: #111827, single line with ellipsis if too long
- "Use this point →" below address: 14px, font-weight: 600, color: #10B981
- This card appears ABOVE the map, overlapping it at top-left area (see Image 3 and Image 6)

---

### Bottom Sheet (white section, ~52% of screen)

**Container:**
```css
background: #FFFFFF;
border-radius: 20px 20px 0 0;
padding: 24px 20px 32px;
/* No shadow needed — it's flush with screen bottom */
```

**Title:**
```css
font-size: 22px;
font-weight: 800;
color: #111827;
margin-bottom: 20px;
letter-spacing: -0.3px;
```
Text: "Where shall we deliver to?" (adapt for move-in: "Where are you moving from?")

**Saved address rows:**

Each row is exactly:
```
Height: auto, min 64px
Layout: [icon 40px] [16px gap] [text stack flex-1] [edit button 36px]
Separator: 1px solid #F3F4F6 between rows (NOT full-width, starts after icon)
```

Icon container:
```css
width: 40px; height: 40px;
border-radius: 10px;   /* rounded square, NOT circle */
background: #F3F4F6;
display: flex; align-items: center; justify-content: center;
font-size: 18px;
```

Icon per address type:
- Current location / Home → navigation arrow icon (📍 or SVG arrow)
- Flat / Building → 🏢 building icon  
- Garden / Outdoor → 🛋️ or custom icon
- Each type has a DIFFERENT icon — do not use same emoji for all

Primary text: `font-size: 15px; font-weight: 600; color: #111827`
Format: "Label · Street name" (label + middot + address on same line)
Secondary text: `font-size: 13px; color: #6B7280; margin-top: 2px`
Content: building details, floor, apartment (e.g. "Bbb, 2, 2")

**"Missing address details" badge** (shown when address is incomplete):
```css
display: inline-block;
background: #FEF3C7;
color: #92400E;
font-size: 11px;
font-weight: 600;
padding: 3px 8px;
border-radius: 6px;
margin-top: 4px;
```

Edit button (right side):
```css
width: 36px; height: 36px;
border-radius: 50%;
border: 1.5px solid #E5E7EB;
background: white;
display: flex; align-items: center; justify-content: center;
```
Icon: pencil/edit SVG, stroke #6B7280, size 16px

**"Add a new address" button:**
```css
width: 100%;
height: 52px;
margin-top: 20px;
border-radius: 14px;
background: #F0FDF4;      /* very light green tint */
border: none;
color: #10B981;
font-size: 16px;
font-weight: 700;
cursor: pointer;
```
On tap → navigate to View C (Search screen)

---

## VIEW B — Address Details Form

This screen appears when user taps the edit icon on any saved address, OR after selecting a location from search.

**Header:**
```
← back arrow (left)     "Address details" (center, bold)
```
Back arrow: simple ← icon, no border, tap goes back

**Address preview (below header):**
- Building icon 🏢 on left
- Street name bold, apartment details in gray below
- No border, just text

**Form fields:**

1. "Building name" input
   - Label: floating label style (small text above input when filled)
   - Clear (×) button inside input on right when has value
   - Border: 1px solid #E5E7EB, border-radius: 12px, height: 56px

2. "Floor number" + "Door number" — side by side, 50/50 width
   - Same style as above
   - Below each: "Required" in red/gray small text if empty

3. "Additional information" — full width textarea
   - Placeholder text only, no label
   - Height: 80px, same border style

**"Mark your entrance" section:**
- Title: "Mark your entrance" bold 16px
- Subtitle: "Done! Thanks for helping the courier" with green checkmark ✅ when set
- Mini map below (non-interactive thumbnail): 100% width, height 140px, border-radius 12px
  - Shows the pin location on the map as a small static preview
  - Use Leaflet with `dragging: false, zoomControl: false, scrollWheelZoom: false`

**"Add a label" section:**
- Title: "Add a label" bold 16px
- Subtitle: "Identify this address more easily next time" gray
- Pill buttons in a row: "Home" | "Flat" | "Custom"
  - Selected pill: dark/filled (#FCD34D yellow or green depending on brand)
  - Unselected: white with border
  - Border-radius: 50px (fully rounded pills)

**"Save address" button:**
- Full width, height: 56px
- Background: #10B981 (solid green)
- Text: "Save address" white, font-weight: 700, font-size: 17px
- Border-radius: 28px (very rounded)
- Fixed at bottom of screen (sticky)

---

## VIEW C — Address Search Screen

This screen appears when user taps "Add a new address".

**Header:**
```
← back arrow     [search input — takes most of width]
```

Search input:
- Rounded pill: border: 1.5px solid #E5E7EB, border-radius: 50px
- Placeholder: "Enter street, building number, etc"
- Search icon 🔍 on LEFT inside input
- Auto-focused when screen opens (keyboard appears immediately)
- Height: 44px

**Search results list (appears as user types):**

Each result row:
```
Layout: [no icon] [text stack] 
Height: 56px
Separator: 1px #F3F4F6
```
Primary: street + number, bold, 15px, #111827
Secondary: city + country, 13px, #6B7280
Example:
```
Avenue Allal Al Fassi, 182
Essaouira, Morocco
```

NO icons on result rows — clean text only (see Image 5)

Bottom of screen: "Powered by Google" text (small, right-aligned, gray)
→ Since we use Nominatim not Google, replace with: "© OpenStreetMap contributors"

On result tap:
1. Navigate to map screen briefly to show the location
2. Then immediately open View B (Address Details) with the selected location pre-filled

---

## GPS PERMISSION & FIRST LAUNCH (Image 1)

On first launch or when GPS is needed:
- Trigger `navigator.geolocation.getCurrentPosition()` 
- The browser/OS will show its own native permission dialog
- Do NOT build a custom permission modal — the OS handles this (Image 1 is the OS dialog)
- After permission granted: fly map to user location at zoom 17

---

## KEY BEHAVIORAL DIFFERENCES — Built vs Expected

| Behavior | Currently Built (Wrong) | Expected (Glovo-style) |
|----------|------------------------|----------------------|
| Map zoom | Too zoomed out (city level) | Zoom 16–17 (street level, 3–4 blocks visible) |
| GPS fly animation | Instant jump | Slow smooth flyTo, duration: 1.5s |
| Pin shape | Triangle CSS trick or wrong proportions | True SVG teardrop path with white inner dot |
| Blue GPS dot | Missing | Separate Leaflet circleMarker at actual GPS coords |
| Address card position | Bottom of map or in bottom sheet | Floating TOP of map, to right of X button |
| Bottom sheet | Single panel | True split: map top 48%, sheet bottom 52% |
| Address row icons | All same / circles | Different per type, rounded SQUARE background |
| Edit button | Flat or missing | Circle with border, pencil SVG icon |
| Search screen | Inline in map bottom | Separate full-screen with keyboard auto-open |
| Address details | Missing entirely | Full form: building, floor, door, label, mini map |
| Map tile warmth | Too gray/cold or too colorful | Warm beige (Carto Voyager) — buildings cream, roads subtle yellow |
| Zoom on GPS tap | Instant | flyTo zoom 17, animate 1.5 seconds |

---

## COMPONENT FILE STRUCTURE

```
/components/location-picker/
  index.tsx                  ← exports LocationPicker
  MapView.tsx                ← Leaflet map + fixed pin + GPS button
  AddressCard.tsx            ← floating card top of map (address + "Use this point")  
  BottomSheet.tsx            ← "Where shall we deliver to?" + address list
  AddressRow.tsx             ← single saved address row component
  AddressDetailsForm.tsx     ← View B: building/floor/door/label form
  AddressSearch.tsx          ← View C: search input + results list
  types.ts                   ← shared TypeScript interfaces
  hooks/
    useReverseGeocode.ts     ← debounced Nominatim reverse geocode
    useAddressSearch.ts      ← Nominatim search with debounce
    useUserLocation.ts       ← GPS location hook
```

---

## ANIMATION SPECS

| Interaction | Animation |
|-------------|-----------|
| Bottom sheet appear | slide up from y+100% → y0, ease-out, 350ms |
| GPS button tap → map fly | map.flyTo() with duration: 1.5 — smooth, not instant |
| Pin while map is moving | scale up slightly: transform scale(1.1), ease 150ms |
| Pin when map stops | scale back to 1.0, ease 150ms (gives "dropped" feel) |
| Screen transitions (A→B, A→C) | slide left, 300ms ease |
| Address card address text update | fade out old → fade in new, 200ms |
| Search results appear | fade in + slide down, stagger 50ms per row |

---

## TILE URL FINAL ANSWER

```javascript
// ✅ USE THIS — Carto Voyager (warm, readable, matches Glovo exactly)
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }
)
```

---

## NOTES FOR AGENT

1. The address card floats on the MAP (absolute positioned), not in the bottom sheet
2. The bottom sheet title changes per context: "Where are you moving from?" / "Where are you moving to?"
3. Zoom level 16-17 is NON-NEGOTIABLE — the current zoom is too far out
4. GPS flyTo must be animated (1.5s duration) — instant jump feels broken
5. The blue GPS dot is a SEPARATE marker from the green pin — they appear at different positions
6. View B (Address Details) is a required screen — do not skip it
7. Auto-focus the search input in View C so keyboard opens immediately
8. All 3 views are separate routes or conditional renders — not stacked modals

---

## MAP CONTEXT MODES (Current Implementation)

To prevent regressions, the map engine (`MapView.tsx`) supports 3 distinct modes with specific behavioral overrides.

### 1. Client Home Mode (`CompactHomeMap.tsx`)
*   **Zoom**: `17` (Building level).
*   **Pin**: `showCenterPin={true}` (CSS overlay).
*   **Panning**: standard (follows center).
*   **Purpose**: Quick visual of the user's active sector.

### 2. Location Selection Mode (`Step1/page.tsx`)
*   **Zoom**: `16` (Initial) -> `17` (on GPS fly).
*   **Pin**: `showCenterPin={true}` (Teardrop SVG with reverse geocode on `moveend`).
*   **Panning**: Fluid center-fix.
*   **Purpose**: Interactive address identification.

### 3. Order Review Mode (`Step2/page.tsx`)
*   **Zoom**: `16` (Balanced neighborhood view).
*   **Pin**: `clientPin` (Leaftlet-anchored marker).
*   **Address Bubble**: Hidden (to avoid covering providers/route).
*   **Center Pin**: `showCenterPin={false}` (CSS overlay REMOVED).
*   **Center Lock**: `lockCenterOnFocus={false}` (Map FLIES to Bricolers on card swipe to identify them).
*   **FitBounds**: `disableFitBounds={true}` (Map does NOT reframe on provider load).
*   **Purpose**: Identify selected providers and see their distance to the confirmed job location.

---

## TECHNICAL PROPS (`MapView.tsx`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `lockCenterOnFocus` | `boolean` | `false` | If `true`, the map stays centered on the client address even when a provider pin is selected. |
| `disableFitBounds` | `boolean` | `false` | If `true`, skips the automated `fitBounds` that happens when the provider list loads. |
| `clientPin` | `{lat, lng}` | `undefined` | If provided, renders a geographic Leaflet marker + address bubble at the specified coordinates (Step 2 style). |
| `zoom` | `number` | `15` | Sets the initial and target zoom level. In modern build, `17` is the preferred "reasonable" zoom for Client UI. |
