# 🏠 Lbricol Home Page — UI Correction Instructions
# Built (Image 1) vs Expected (Image 2)

---

## ✅ ALREADY CORRECT — DO NOT TOUCH
- Service category circles with illustrations ✅
- Green underline on selected category (Childcare) ✅
- Sub-service pill buttons below categories ✅
- Trust signal checklist items ✅
- Bottom navigation bar (Home, Orders, My Heroes, Profile) ✅
- "Search services..." bar ✅
- Page title "Book trusted help for home tasks" ✅

---

## ❌ ISSUE 1 — Map Position Is Wrong (Most Critical)

**Built (Image 1):**
- Map occupies the FULL TOP of the screen edge-to-edge
- Map takes ~35–40% of screen height
- Lbricol yellow pin sits directly on the map
- Map feels like a background element behind the content

**Expected (Image 2):**
- Map is a CARD embedded INSIDE the scrollable page content
- It sits BELOW the hero title ("Book trusted help for home tasks")
- It has rounded corners: `border-radius: 16px`
- It has a subtle shadow: `box-shadow: 0 2px 12px rgba(0,0,0,0.08)`
- It has margins left and right: `margin: 0 16px`
- Map card height: ~220px (not full screen height)
- The map card is NOT full-bleed — it's contained like any other card

**Fix — restructure the home page layout:**
```jsx
// ❌ WRONG — map at top as background
<div style={{ height: '40vh' }}><MapView /></div>
<div style={{ flex: 1, overflow: 'auto' }}>
  <h1>Book trusted help...</h1>
  ...
</div>

// ✅ CORRECT — map as inline card inside scrollable content
<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
  
  {/* Top bar */}
  <TopBar />

  {/* Scrollable page content — NO fixed map at top */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px 0' }}>
    
    {/* Hero title */}
    <h1 style={{
      fontSize: 40,
      fontWeight: 900,
      color: '#111827',
      textAlign: 'center',
      padding: '24px 24px 20px',
      lineHeight: 1.15,
    }}>
      Book trusted help for home tasks
    </h1>

    {/* Map CARD — inline, rounded, with margin */}
    <div style={{
      margin: '0 16px 24px',
      borderRadius: 16,
      overflow: 'hidden',
      height: 220,
      position: 'relative',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    }}>
      <MapCard />   {/* Leaflet map inside this card */}
      <LocationLabel />
      <ExploreNearbyButton />
      <GPSButton />
    </div>

    {/* Search bar */}
    <SearchBar />

    {/* Service categories */}
    <ServiceCategories />

    {/* Sub-services */}
    <SubServices />

    {/* Trust signals */}
    <TrustSignals />
  </div>

  <BottomNavBar />
</div>
```

---

## ❌ ISSUE 2 — Top Bar Is Completely Wrong

**Built (Image 1):**
- No top bar at all — content starts directly with the map
- No location indicator at top
- No notification bell

**Expected (Image 2):**
- Clean white top bar with TWO elements:
  1. **Location pill** — centered, shows current neighborhood + city
  2. **Notification bell** — top-right corner, white circle button

**Location pill (center of top bar):**
```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: '#F3F4F6',
  borderRadius: 50,
  padding: '8px 16px',
  cursor: 'pointer',
}}>
  {/* Green dot */}
  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
  <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
    {neighborhood}, {city}
  </span>
  {/* Dropdown chevron */}
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 4L6 8L10 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
</div>
```

**Notification bell (top-right):**
```jsx
<button style={{
  width: 44, height: 44,
  borderRadius: '50%',
  background: '#F3F4F6',
  border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
}}>
  🔔  {/* or SVG bell icon */}
</button>
```

**Top bar layout:**
```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  background: '#fff',
}}>
  <div style={{ width: 44 }} />   {/* spacer to center the pill */}
  <LocationPill />
  <NotificationButton />
</div>
```

---

## ❌ ISSUE 3 — Map Card Internal Layout Is Wrong

**Built (Image 1):**
- Address card floats at top-left of map (white card with address + "Define another Address")
- No "Explore Nearby" button
- GPS button styled differently

**Expected (Image 2):**
The map CARD has 3 overlaid elements:

**A) Location label — top-left:**
```jsx
<div style={{
  position: 'absolute',
  top: 12, left: 12,
  zIndex: 500,
  background: '#fff',
  borderRadius: 50,
  padding: '8px 14px',
  display: 'flex', alignItems: 'center', gap: 6,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
}}>
  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
    {neighborhood}, {city}
  </span>
</div>
```
Note: this is a COMPACT PILL — NOT the full address card with bike icon. Just neighborhood + city.

**B) "Explore Nearby" button — bottom-left:**
```jsx
<div style={{
  position: 'absolute',
  bottom: 12, left: 12,
  zIndex: 500,
  background: 'rgba(255,255,255,0.92)',
  borderRadius: 50,
  padding: '10px 16px',
  display: 'flex', alignItems: 'center', gap: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
}}>
  <span style={{ fontSize: 16 }}>🔍</span>
  <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Explore Nearby</span>
</div>
```
On tap: zoom map in, show nearby available Bricolers on map

**C) GPS/direction button — bottom-right:**
```jsx
<div style={{
  position: 'absolute',
  bottom: 12, right: 12,
  zIndex: 500,
  width: 40, height: 40,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.92)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
}}>
  {/* Arrow/direction SVG icon — NOT crosshair */}
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</div>
```
Note: this is a NAVIGATION ARROW icon (↗ direction), NOT a crosshair. Different from the location picker GPS button.

**D) No Lbricol yellow pin on home map card**
The home map card does NOT show the custom yellow Lbricol pin. It just shows the map tiles with the neighborhood. Keep it clean and non-interactive on home — it's decorative/informational, not a picker.

---

## ❌ ISSUE 4 — Hero Title Font Size Too Small

**Built (Image 1):**
- Title is ~28px, two lines, moderate weight
- Feels compact

**Expected (Image 2):**
- Title is VERY LARGE — ~40–44px, three lines, extremely bold (font-weight: 900)
- Takes up significant vertical space — it's a statement
- Line height: 1.1–1.15 (tight)
- Text align: center

```css
font-size: 40px;        /* or clamp(32px, 8vw, 44px) */
font-weight: 900;
line-height: 1.1;
text-align: center;
color: #111827;
padding: 24px 20px 20px;
```

---

## SUMMARY TABLE

| # | Element | Built (Wrong) | Expected (Fix) |
|---|---------|--------------|----------------|
| 1 | Map position | Full-width top of screen, ~40vh | Inline card inside scroll, 220px height, 16px margins, rounded corners |
| 2 | Top bar | Missing entirely | Location pill (centered) + notification bell (right) |
| 3 | Map card overlays | Address card with bike icon + GPS crosshair | Compact location pill (top-left) + "Explore Nearby" pill (bottom-left) + direction arrow (bottom-right) |
| 4 | Hero title size | ~28px, moderate | ~40px, font-weight 900, 3 lines, very bold |
| 5 | Lbricol pin on home | Yellow Lbricol pin visible | No custom pin on home map — just clean map tiles |

---

## PAGE SCROLL BEHAVIOR

**Expected (Image 2):**
- The ENTIRE PAGE scrolls as one unit
- Top bar stays fixed (sticky)
- Bottom nav bar stays fixed
- Hero title → map card → search bar → categories → sub-services all scroll together
- There is NO split layout on the home page (split layout is only for service booking flow)
