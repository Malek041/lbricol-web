# 🏗️ Lbricol — Service Order Flow Redesign
# From: Full-page screens
# To: Persistent map (top) + Bottom sheet flow (bottom)
# Reference: Images 1–7 (Babysitting service example)

---

## CORE CONCEPT — The New Layout Architecture

Every screen in the service booking flow must follow this **fixed split layout**:

```
┌─────────────────────────────────┐
│                                 │
│        MAP CARD (~40% height)   │  ← ALWAYS VISIBLE, NEVER CHANGES HEIGHT
│    [address card top-left]      │
│    [Lbricol yellow pins]        │
│    [service breadcrumb pill]    │
│    [GPS button bottom-right]    │
│                                 │
├─────────────────────────────────┤
│                                 │
│     BOTTOM SHEET (~60% height)  │  ← CONTENT CHANGES PER STEP
│     (scrollable if needed)      │
│                                 │
│     [step-specific content]     │
│                                 │
│  [← back]        [Next →]       │  ← fixed navigation bar at bottom
└─────────────────────────────────┘
```

**Rules:**
- The map NEVER disappears or shrinks — it stays at ~40% of screen height throughout ALL steps
- The bottom sheet content slides/transitions between steps
- The bottom sheet does NOT slide up to cover the map
- Navigation (back / next) is always pinned to the bottom of the sheet
- The overall page does NOT scroll — only the bottom sheet content scrolls internally if needed

---

## MAP CARD — Persistent Elements

### Address Card (top-left of map, always present)
```jsx
// Position: absolute, top: 12px, left: 12px, right: 12px
// Same style as previously built — white card, rounded, shadow
// Content changes based on context:

// During location selection steps:
{ address: "Avenue Allal El Fassi...", cta: "Use this point →" }

// During all other steps (service flow):
{ address: "Avenue Allal El Fassi...", cta: "Define another Address" }
// "Define another Address" in green — tapping it reopens the location picker
```

### Service Breadcrumb Pill (bottom-center of map)
Visible from step 1 of the service flow onward. Shows current service path.

```jsx
// Position: absolute, bottom: 14px, left: 50%, transform: translateX(-50%)
// BUT shifted left to leave room for GPS button on the right

<div style={{
  position: 'absolute',
  bottom: 14,
  left: 16,
  right: 64,   // leaves space for GPS button
  zIndex: 900,
  background: '#FEF9C3',   // soft yellow background
  borderRadius: 50,
  padding: '8px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
}}>
  <span style={{ fontSize: 16 }}>{serviceEmoji}</span>
  <span style={{ fontSize: 13, fontWeight: 600, color: '#78350F' }}>
    {serviceName} › {subServiceName}
  </span>
</div>

// Example: "🧒 Babysitting › Regular Babysitting"
// Example: "🚚 Moving Help › Van"
```

### Lbricol Yellow Pins (provider locations on map)
Visible ONLY during the "Select a Provider/Bricoler" step.

```javascript
// The yellow pin icon is at:
// /public/Images/map Assets/locationPinYellowOnly.png

// When entering the provider selection step:
// 1. Fetch available providers from Firestore for this service + city
// 2. For each provider, add a Leaflet marker with the custom yellow icon

const yellowIcon = L.icon({
  iconUrl: '/Images/map Assets/locationPinYellowOnly.png',
  iconSize: [36, 48],          // width, height in px
  iconAnchor: [18, 48],        // anchor at bottom-center of pin
  popupAnchor: [0, -48],
});

providers.forEach(provider => {
  L.marker([provider.lat, provider.lng], { icon: yellowIcon })
    .addTo(map)
    .on('click', () => scrollToProviderCard(provider.id));
});

// When leaving the provider selection step:
// Remove all yellow markers from map
```

**Map behavior during provider step:**
- Zoom out slightly to zoom 14 so multiple provider pins are visible
- Fit map bounds to show all available providers: `map.fitBounds(providerBounds, { padding: [40, 40] })`
- Tapping a yellow pin on map scrolls the bottom sheet to that provider's card
- Tapping a provider card in the sheet makes the map pan to their pin

### GPS Button (always visible, bottom-right of map)
```jsx
// Position: absolute, bottom: 14px, right: 14px
// Same crosshair SVG icon as previously built
// Always present regardless of step
```

---

## BOTTOM SHEET — Step-by-Step Content

### Navigation Bar (pinned to bottom of sheet, always visible)
```jsx
<div style={{
  position: 'sticky',
  bottom: 0,
  background: '#fff',
  padding: '12px 20px 24px',
  borderTop: '1px solid #F3F4F6',
  display: 'flex',
  gap: 12,
  alignItems: 'center',
}}>
  {/* Back button — gray pill */}
  <button style={{
    width: 48, height: 48,
    borderRadius: 50,
    background: '#F3F4F6',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    ‹
  </button>

  {/* Next button — green pill, full width */}
  <button style={{
    flex: 1,
    height: 48,
    borderRadius: 50,
    background: isStepComplete ? '#10B981' : '#E5E7EB',
    color: isStepComplete ? '#fff' : '#9CA3AF',
    border: 'none',
    fontSize: 16,
    fontWeight: 700,
    cursor: isStepComplete ? 'pointer' : 'not-allowed',
  }}>
    {isLastStep ? 'Confirm Booking' : 'Next'}
  </button>
</div>
```

---

## STEP TRANSITIONS

Between steps, animate the bottom sheet content:
```javascript
// Outgoing content: slide left + fade out (200ms)
// Incoming content: slide in from right + fade in (250ms)
// Use CSS transitions or Framer Motion:

// exit: { x: -30, opacity: 0, transition: { duration: 0.2 } }
// enter: { x: 30, opacity: 0 } → { x: 0, opacity: 1, transition: { duration: 0.25 } }
```

---

## SERVICE FLOW STEPS — Using Babysitting as Reference

Adapt these steps for each service. The structure is the same, content differs.

---

### STEP 0 — Service & Sub-service Selection
**Trigger:** User taps a service category on the home page
**Map state:** Address card shows current location, no yellow pins, no breadcrumb yet

**Bottom sheet content:**
```
Title: [Service name]  (e.g. "Childcare")
Subtitle: "Choose a service"

Sub-service options displayed as pill buttons (wrapped, not list):
┌──────────────────┐ ┌──────────────────┐
│ Regular Babysitting│ │ After-School Care │
└──────────────────┘ └──────────────────┘
┌──────────────────┐
│ Day Out Supervision│
└──────────────────┘

Below pills: checklist of 2–3 trust signals
✓ Trusted, background-checked carers for your children.
✓ Now Trending: Bilingual carers and homework-help sessions.
```

**Sub-service pill style:**
```css
/* Unselected */
border: 1.5px solid #E5E7EB;
border-radius: 50px;
padding: 12px 20px;
background: white;
font-size: 15px;
font-weight: 600;
color: #111827;

/* Selected */
border-color: #10B981;
background: #F0FDF4;
color: #10B981;
```

**Next button:** activates when a sub-service is selected
**Breadcrumb pill:** appears on map once sub-service is selected

---

### STEP 1 — Service-Specific Options
**Map state:** Breadcrumb pill visible, no yellow pins
**Example for Babysitting:** "How long is the care needed?"

**Bottom sheet content (from Image 5):**
```
Title: "How long is the care needed?"   (24px, bold, #111827)

Option cards — vertical stack, each card:
┌─────────────────────────────────────────┐
│ Short Term (1-4 hrs)    ≈ Est: 3 hrs   │
│ Brief assistance or babysitting slot.   │
└─────────────────────────────────────────┘
```

**Option card style:**
```jsx
<div style={{
  border: selected ? '2px solid #10B981' : '1.5px solid #E5E7EB',
  borderRadius: 16,
  padding: '16px 18px',
  marginBottom: 12,
  background: selected ? '#F0FDF4' : '#fff',
  cursor: 'pointer',
  position: 'relative',
}}>
  {/* Discount badge — top right corner (optional) */}
  {discount && (
    <div style={{
      position: 'absolute',
      top: -10, right: 16,
      background: discount === '-5%' ? '#F59E0B' : '#8B5CF6',  // yellow or purple
      color: 'white',
      fontSize: 12,
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: 50,
    }}>
      {discount}
    </div>
  )}

  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{title}</span>
    {/* Estimate badge */}
    <span style={{
      background: '#D1FAE5',
      color: '#065F46',
      fontSize: 13,
      fontWeight: 600,
      padding: '4px 12px',
      borderRadius: 50,
    }}>
      ≈ Est: {estimate}
    </span>
  </div>
  <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{description}</p>
</div>
```

---

### STEP 2 — Select Provider / Bricoler
**Map state:** Yellow Lbricol pins appear on map showing provider locations. Map zooms to fit all pins.
**This is the most visually important step.**

**Bottom sheet content (from Image 6):**
```
Title: "Find your Tasker"   (22px, bold)

Provider cards — vertical stack, one per available Bricoler:
```

**Provider card style:**
```jsx
<div style={{
  border: '1px solid #F3F4F6',
  borderRadius: 16,
  padding: '16px',
  marginBottom: 16,
  background: '#fff',
}}>
  {/* Top row */}
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
    {/* Avatar */}
    <img src={provider.avatarUrl} style={{
      width: 52, height: 52, borderRadius: '50%', objectFit: 'cover'
    }} />

    <div style={{ flex: 1 }}>
      {/* Name + price row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{provider.name}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
          MAD {provider.minRate} (min) ✓
        </span>
      </div>

      {/* NEW badge */}
      {provider.isNew && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#EEF2FF', color: '#6366F1',
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 50, marginTop: 4,
        }}>
          ✦ NEW
        </span>
      )}

      {/* Rating row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontSize: 13, color: '#374151' }}>★ {provider.rating.toFixed(1)}</span>
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

  {/* Bio text */}
  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 10 }}>
    {provider.bio}
  </p>
  <button style={{ color: '#10B981', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
    Read More
  </button>

  {/* Select button */}
  <button style={{
    width: '100%', height: 48, marginTop: 12,
    background: '#10B981', color: '#fff',
    border: 'none', borderRadius: 50,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
  }}>
    Select & Continue
  </button>
</div>
```

**When provider is selected:**
- Their yellow pin on the map changes to a larger/highlighted state
- Their service illustration icon also appears on the map near their pin (see Image 6 — the childcare illustration pin)
- Navigate to Step 3

---

### STEP 3 — Date & Time Selection
**Map state:** Selected provider's pin + service illustration pin visible. Yellow pins for non-selected providers are removed.

**Bottom sheet content (from Image 7):**
```
Header row: [provider avatar] "Mery Majjoud — Availability"  [× close/back]

Calendar:
Month title: "March — April 2026"  (centered, bold)
Day grid: SUN MON TUE WED THU FRI SAT
- Today's date: filled green circle, white text
- Available dates: small green dot below the number
- Unavailable: no dot, grayed number
- Past dates: light gray, not tappable

Time slots (below calendar):
Section label: "MORNING"  (11px, uppercase, gray, letter-spacing)
Time buttons in a row: "10:00"  "11:00"  "12:00"
- Selected: green filled pill
- Unselected: just the time text, no border

Section label: "AFTERNOON"
Time buttons: "13:00"  "14:00"  ...
```

**Calendar day style:**
```jsx
// Available day with dot:
<div style={{ textAlign: 'center', position: 'relative', padding: '8px 6px', cursor: 'pointer' }}>
  <span style={{
    display: 'block',
    width: 36, height: 36,
    borderRadius: '50%',
    background: isSelected ? '#10B981' : 'transparent',
    color: isSelected ? '#fff' : isToday ? '#10B981' : '#111827',
    fontWeight: isSelected || isToday ? 700 : 400,
    fontSize: 15,
    lineHeight: '36px',
    textAlign: 'center',
  }}>
    {day}
  </span>
  {/* Availability dot */}
  {isAvailable && !isSelected && (
    <div style={{
      width: 4, height: 4, borderRadius: '50%',
      background: '#10B981',
      margin: '2px auto 0',
    }} />
  )}
</div>

// Time slot button:
<button style={{
  padding: '12px 20px',
  borderRadius: 12,
  background: isSelected ? '#10B981' : '#F9FAFB',
  color: isSelected ? '#fff' : '#111827',
  border: 'none',
  fontSize: 15,
  fontWeight: isSelected ? 700 : 400,
  cursor: 'pointer',
  marginRight: 8,
}}>
  {time}
</button>
```

**Bottom navigation for this step:**
```jsx
// Back arrow (left) + "Next Step" green pill (right)
// Same pattern as all other steps
```

---

## PAGE-LEVEL LAYOUT IMPLEMENTATION

```jsx
// pages/services/[serviceId]/order.tsx  (or app router equivalent)

export default function ServiceOrderPage() {
  const [step, setStep] = useState(0);
  const [orderData, setOrderData] = useState({});

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',       // ← prevents whole page from scrolling
      background: '#fff',
    }}>

      {/* ── MAP SECTION — fixed height, always visible ── */}
      <div style={{
        height: '40vh',          // ← always 40% of screen
        flexShrink: 0,           // ← never shrinks
        position: 'relative',
      }}>
        <MapCard
          step={step}
          orderData={orderData}
          providers={step === PROVIDER_STEP ? availableProviders : []}
        />
      </div>

      {/* ── BOTTOM SHEET — takes remaining 60% ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        background: '#fff',
      }}>

        {/* Scrollable content area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px 0',
          WebkitOverflowScrolling: 'touch',
        }}>
          <AnimatePresence mode="wait">
            <StepContent key={step} step={step} data={orderData} onChange={setOrderData} />
          </AnimatePresence>
        </div>

        {/* Fixed navigation bar */}
        <NavigationBar
          onBack={() => setStep(s => s - 1)}
          onNext={() => setStep(s => s + 1)}
          isNextEnabled={isStepComplete(step, orderData)}
          isLastStep={step === TOTAL_STEPS - 1}
        />
      </div>

    </div>
  );
}
```

---

## HOME PAGE CHANGES NEEDED

**Current home page (Image 2):** Full-page layout, service categories visible, no map

**New home page (Image 3):** Map card at top (~35% height), rest is scrollable content below

```jsx
// Home page layout:
<div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

  {/* Compact map at top — always shows user's current location */}
  <div style={{ height: '35vh', flexShrink: 0, position: 'relative' }}>
    <HomeMapCard />   {/* address card + Lbricol logo pin at user location */}
  </div>

  {/* Scrollable home content */}
  <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
    <h1 style={{ fontSize: 28, fontWeight: 900 }}>Book trusted help for home tasks</h1>
    <SearchBar />
    <ServiceCategories onSelect={navigateToServiceFlow} />
    {/* etc */}
  </div>

  <BottomNavBar />
</div>
```

---

## IMPORTANT IMPLEMENTATION NOTES

1. **Yellow pin path**: `/public/Images/map Assets/locationPinYellowOnly.png`
   - Use `L.icon({ iconUrl: '/Images/map Assets/locationPinYellowOnly.png', iconSize: [36, 48], iconAnchor: [18, 48] })`
   - The space in the path is fine for Next.js public folder — just URL-encode it if needed: `/Images/map%20Assets/locationPinYellowOnly.png`

2. **Map height is 40vh** — not a fixed pixel value, so it adapts to all screen sizes

3. **Do NOT use a sliding bottom sheet** (one that animates up from bottom) — the sheet is always at 60% height, content inside it transitions, not the sheet itself

4. **Provider pins on map** — only add them at the provider selection step, remove them at all other steps

5. **The service illustration pin** (e.g. the babysitting child illustration on a yellow teardrop in Images 6 & 7) — this is the selected provider's "avatar pin" showing where they are on the map. Use a custom L.divIcon with the provider's avatar inside a yellow teardrop shape.

6. **Breadcrumb pill** updates as user progresses: first shows just service name, then "Service › Sub-service" after sub-service is chosen

7. **Back navigation**: Going back removes yellow pins, resets map zoom to default (zoom 16), clears step-specific map elements

8. **"Define another Address"** CTA in the address card (Images 3–7): tapping it should open the location picker as a full-screen modal overlay on top of the current flow, not navigate away from it
