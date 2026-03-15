# 🗺️ Lbricol — Location Picker: IDE Agent Instructions

## Overview

Build a **mobile-first location picker** for Lbricol, inspired by Glovo's map UI. This component is used in service flows (e.g. move-in help, cleaning, delivery) to let users set one or two locations (pickup and/or dropoff) using an interactive map. The map must use **Leaflet + OpenStreetMap** (free, no API key needed).

---

## Tech Stack

- **Framework**: Next.js (App Router)
- **Map**: Leaflet 1.9.4 (loaded dynamically to avoid SSR issues)
- **Geocoding**: Nominatim (OpenStreetMap's free reverse geocoding + search API)
- **Routing/Distance**: OpenRouteService API (free tier, for future distance/pricing use)
- **Styling**: Tailwind CSS (or inline styles if Tailwind is not configured)
- **Language**: TypeScript preferred, JavaScript accepted

---

## File Structure

```
/components
  /location-picker
    LocationPicker.tsx        ← Main exported component
    MapView.tsx               ← Full-screen Leaflet map
    AddressBar.tsx            ← Floating address display on map
    BottomSheet.tsx           ← Sliding bottom panel
    SavedAddressList.tsx      ← List of user's saved addresses
    SearchBar.tsx             ← Address search input
    types.ts                  ← Shared TypeScript types
```

---

## Visual Layout — Exact Specifications

### SCREEN 1: Map with Pin (Active Picking State)

Reproduce this layout **pixel-accurately** based on the Glovo reference:

```
┌─────────────────────────────────┐
│ [X]                      [↗]    │  ← Top bar: close (left), GPS arrow (right)
│                                 │
│         FULL SCREEN MAP         │
│         (edge to edge)          │
│                                 │
│           [PIN]                 │  ← Draggable green pin, centered
│            ●                    │    White dot inside pin head
│                                 │
│                        [⊕ GPS] │  ← Locate-me button, bottom right
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🚲  Avenue Allal Al Fassi,  │ │  ← White floating card, rounded top corners
│ │     182                     │ │    Icon on left (bicycle for move-in)
│ │     Use this point ↗        │ │    Address in bold, "Use this point" in green
│ └─────────────────────────────┘ │
│ Trouble locating your address?  │  ← Hint text, gray, centered
│ Try using search instead        │
│ ┌─────────────────────────────┐ │
│ │ 🔍 Search street, city...   │ │  ← Search bar, full width, rounded
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Key visual details:**
- Map is **truly full screen** — goes under the status bar and fills 100% width/height
- The white card at the bottom has rounded top corners (border-radius top: 20px)
- The card has a **subtle shadow** (box-shadow upward)
- Pin is **dark green** (#1A7A5E or similar deep green), not bright
- Pin has a **white circular dot** in the center of the head
- Pin tail is a pointed bottom (classic teardrop/location pin shape)
- The pin **bounces slightly** when dropped (CSS animation)
- "Use this point" text is **green and bold**, with a small arrow icon
- The bicycle icon (🚲) on the card represents the service type — make this dynamic
- The GPS locate button is a circle with a target/crosshair icon, bottom right of map
- Background map tiles use the **standard OSM tile style**

---

### SCREEN 2: Address Confirmation / Saved Addresses (Bottom Sheet Expanded)

```
┌─────────────────────────────────┐
│ [X]                             │
│                                 │
│         MAP (top ~45%)          │
│         slightly dimmed         │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 🚲  Avenue Allal Al Fassi,  │ │  ← Address pill, floats on map
│ │     182                     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  Where shall we deliver to?     │  ← Bold title, large
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 📍 Home · Avenue Allal...   │ │  ← Saved address row
│ │    Current location     [✏️]│ │    Edit icon on far right
│ ├─────────────────────────────┤ │
│ │ 🛋️  Rue Lamsalla            │ │  ← Another saved address
│ │    Garden               [✏️]│ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     + Add a new address     │ │  ← CTA button, full width
│ │     (outlined green btn)    │ │    Border: green, text: green, bg: white
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Key visual details:**
- Bottom sheet has **white background**, rounded top corners (24px)
- Sheet slides up with a **smooth spring animation**
- Title "Where shall we deliver to?" is **bold, ~22px, dark**
- Each saved address row has:
  - Left: colored icon in a soft circle background
  - Middle: **label in bold** (Home, Work, Garden) + address in gray below
  - Right: pencil/edit icon button
- Row separator is a **thin light gray line**
- "Add a new address" button is **outlined** (white bg, green border, green text, full width, 48px tall, 12px radius)
- No shadow on rows, clean flat list

---

## Component Behavior

### MapView.tsx

```
- Load Leaflet dynamically (import('leaflet')) to avoid SSR crash in Next.js
- Default map center: user's current GPS position (navigator.geolocation)
  - Fallback center: Rabat, Morocco [34.0209, -5.0082]
- Map zoom: 15
- Disable default Leaflet attribution (or style it minimally)
- Custom pin icon: use L.divIcon() with inline SVG (do NOT use default Leaflet marker)
- On map drag (moveend): update pin to map center (center-pin style like Glovo)
  - This means the pin stays FIXED at center of screen visually
  - The map moves underneath it
  - On moveend, fire reverse geocode with new center coords
- Pin must be absolutely centered on top of map container (CSS position absolute, z-index above map)
- Show a subtle "pulsing" blue dot for user's current GPS location (like Google Maps)
```

### Reverse Geocoding (Nominatim)

```
Endpoint: https://nominatim.openstreetmap.org/reverse
Params: lat, lon, format=json, accept-language=en
Rate limit: max 1 request per second — debounce map moveend by 800ms

Display format: Take first 3 parts of display_name split by comma
Example: "Avenue Allal Al Fassi, 182, Marrakech" 
```

### Address Search (Nominatim)

```
Endpoint: https://nominatim.openstreetmap.org/search
Params: q=<query>, format=json, limit=5, accept-language=en, countrycodes=ma
Show results in a dropdown below the search bar
On result tap: fly map to that location, update pin and address
```

### GPS Locate Button

```
On tap: call navigator.geolocation.getCurrentPosition()
On success: fly map to user location, trigger reverse geocode
Show loading spinner while waiting for GPS
```

---

## Props Interface

```typescript
// types.ts
export interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
}

export interface SavedAddress {
  id: string;
  label: string;         // "Home", "Work", "Garden"
  icon: string;          // emoji or icon name
  address: string;
  lat: number;
  lng: number;
}

export interface LocationPickerProps {
  mode: "single" | "double";
  serviceType: string;               // "move-in" | "cleaning" | "delivery" etc.
  serviceIcon?: string;              // emoji shown in address bar card
  title?: string;                    // "Where shall we deliver to?" etc.
  savedAddresses?: SavedAddress[];
  initialPickup?: LocationPoint;
  initialDropoff?: LocationPoint;
  onConfirm: (result: {
    pickup: LocationPoint;
    dropoff?: LocationPoint;
  }) => void;
  onClose?: () => void;
}
```

---

## Two-Location Flow (mode="double", e.g. move-in)

When `mode="double"`:

1. **Step 1 — Pickup**: Show map with green pin, title "Where are you moving FROM?"
2. User taps "Use this point" → pickup is saved, screen transitions to Step 2
3. **Step 2 — Dropoff**: Show map with blue pin, title "Where are you moving TO?"
4. User taps "Use this point" → dropoff is saved
5. **Step 3 — Summary**: Show a mini map with both pins and a dashed line between them, confirm button

**Pin colors:**
- Pickup: `#10B981` (green)
- Dropoff: `#3B82F6` (blue)

**Step indicator**: Show a small "Step 1 of 2" or a 2-dot progress indicator at top of bottom card.

---

## Animations

| Element | Animation |
|---|---|
| Pin drop on location change | Bounce: translateY(-10px) → translateY(0) over 300ms |
| Bottom sheet appear | Slide up from bottom: translateY(100%) → translateY(0), ease-out 350ms |
| Map fly to location | Leaflet's built-in flyTo() with duration: 1.2 |
| Search results dropdown | Fade in + slide down, 200ms |
| GPS button loading | Rotating spinner inside button |

---

## Color Palette

```css
--green-primary: #10B981;
--green-dark: #059669;
--green-light: #D1FAE5;
--blue-primary: #3B82F6;
--blue-light: #DBEAFE;
--text-primary: #111827;
--text-secondary: #6B7280;
--text-muted: #9CA3AF;
--border: #E5E7EB;
--bg-sheet: #FFFFFF;
--bg-page: #F9FAFB;
```

---

## Typography

```css
font-family: 'DM Sans', 'Plus Jakarta Sans', or system-ui
font-size address label: 16px, font-weight: 700
font-size address sub: 13px, font-weight: 400, color: #6B7280
font-size sheet title: 22px, font-weight: 800
font-size saved address label: 15px, font-weight: 600
font-size saved address sub: 12px, color: #6B7280
font-size hint text: 13px, color: #9CA3AF, text-align: center
```

---

## Usage in a Service Flow Page

```tsx
// app/services/move-in/location/page.tsx

import LocationPicker from "@/components/location-picker/LocationPicker";

export default function MoveInLocationPage() {
  return (
    <LocationPicker
      mode="double"
      serviceType="move-in"
      serviceIcon="🚚"
      title="Where are you moving?"
      onConfirm={({ pickup, dropoff }) => {
        // Save to state/context and navigate to next step
        router.push("/services/move-in/vehicle-type");
      }}
      onClose={() => router.back()}
    />
  );
}
```

---

## Important Notes for Agent

1. **SSR Safety**: Wrap all Leaflet code in `useEffect` or use `dynamic(() => import(...), { ssr: false })`. Leaflet accesses `window` and will crash during SSR.

2. **No API Key needed**: Nominatim and OSM tiles are completely free. Add a `User-Agent` header to Nominatim requests: `User-Agent: Lbricol/1.0`

3. **Rate limiting**: Debounce all Nominatim calls by at least 800ms. Do not fire on every pixel of map drag — only on `moveend`.

4. **Mobile first**: All touch interactions must work. The map must handle touch drag, pinch-to-zoom. Leaflet handles this natively.

5. **The pin is fixed, the map moves**: This is the Glovo/Uber Eats pattern. Do NOT make the pin draggable. Instead, center the pin absolutely over the map using CSS, and on `moveend` read `map.getCenter()` to get the selected coordinates.

6. **Next.js App Router**: Use `"use client"` at the top of all components that use Leaflet, geolocation, or React state.
