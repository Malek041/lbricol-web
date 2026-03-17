# Lbricol Map System Specification

This document outlines the technical architecture, state management, and interaction patterns for the map-based location features in Lbricol.ma.

## 1. Component Inventory

| Component | Location | Responsibility |
| :--- | :--- | :--- |
| `LocationPicker` | `src/components/location-picker/LocationPicker.tsx` | Main orchestrator. Manages the flow between Map, Search, and Address Details. |
| `MapView` | `src/components/location-picker/MapView.tsx` | Pure Leaflet wrapper. Handles tile rendering, GPS marker, and reverse geocoding via Nominatim. |
| `AddressSearch` | `src/components/location-picker/AddressSearch.tsx` | Full-screen UI for searching addresses by text. |
| `AddressDetailsForm` | `src/components/location-picker/AddressDetailsForm.tsx` | Form to add labels (Home, Work), apartment numbers, and instructions. |
| `EntrancePicker` | `src/components/location-picker/EntrancePicker.tsx` | Special flow for "Mark Your Entrance" using a yellow-only pin. |
| `CompactHomeMap` | `src/components/shared/CompactHomeMap.tsx` | Visual preview of the map on the landing page/dashboard. |
| `AddressCard` | `src/components/location-picker/AddressCard.tsx` | The floating address bubble (White card) appearing above the pin showing the current address. |
| `SavedAddressList` | `src/components/location-picker/SavedAddressList.tsx` | Scrollable list of user's pre-saved addresses. |

## 2. State & References

| Variable | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| `activeView` | `'MAP' \| 'DETAILS' \| 'SEARCH'` | `LocationPicker` | Controls which primary UI view is active. |
| `currentPoint` | `LocationPoint` | `LocationPicker` | The `{lat, lng, address}` of the center point currently under the map needle. |
| `triggerGps` | `number` (timestamp) | `LocationPicker` / `MapView` | Changing this value triggers the `useEffect` in `MapView` to execute navigator.geolocation. |
| `flyToPoint` | `{lat, lng}` | `LocationPicker` | Programmatically moves the map to a specific location (e.g., after choosing a search result). |
| `pinY` | `number` (0-100) | Props | Decides where the vertical visual center of the map is. Default is `30%` to account for the bottom sheet. |
| `isInteracting` | `boolean` | `LocationPicker` | True when the user is dragging the map. Used to shrink/hide UI elements for better visibility. |
| `isManualSelection` | `boolean` | `LocationPicker` | True when user manually picks an address. Blocks GPS overrides until the GPS button is clicked. |
| `mapRef` | `useRef<L.Map>` | `MapView` | Direct reference to the Leaflet instance for imperative commands like `flyTo` or `invalidateSize`. |

## 3. Expected Behaviors

### GPS Live Position (The "Radar" Dot)
- **Appearance**: A solid green-teal circle (`#10B981`) with a white border and two concentric pulsing circles.
- **Implementation**: Managed inside `MapView.tsx` using `L.divIcon` and CSS keyframes.
- **Movement**: Updates only when "Locate" is clicked or `autoLocate` is triggered. It does not track real-time movement unless manually re-triggered.

### Branded Lbricol Pin (The "Needle")
- **Appearance**: Branded `LocationPin.png` (Yellow/Black) or `locationPinYellowOnly.png` for entrance picking.
- **Behavior**: **CSS-Fixed**. The pin is NOT a Leaflet marker. It is a React element fixed at a specific `top` percentage (`pinY`). The map moves *underneath* it.
- **Visual Feedback**: Bounces slightly in `CompactHomeMap` to draw attention.

### Address Interaction
- **Saved List Selection**: Tapping a saved address triggers `flyToPoint`. The map smoothly glides to the location, and the "needle" geocodes the new center.
- **Address Search**: Choosing a result from the search list sends coordinates to the parent, which switches the view back to the map or goes straight to Details.
- **Confirm This Location**: Validates that `currentPoint` exists and proceeds to the `DETAILS` view for saving or finalizes the selection.
- **Set Another Address**: Resets the view or opens the `SEARCH` overlay.

### GPS Locator Button
- **Action**: Sets `triggerGps` to `Date.now()`.
- **Feedback**: Map flies to the user's current coordinates. A loading spinner replaces the icon while the browser/phone calculates position.
- **Offset**: Note that the fly-to logic respects `pinY` to ensure the user's location is centered under the needle, not the geometric center of the screen.

## 4. Data Flow

1.  **Map → App**: User pans map → `MapView` fires `onLocationChange` (debounced) → `LocationPicker` updates `currentPoint`.
2.  **Search → Map**: User picks search result → `LocationPicker` updates `flyToPoint` → `MapView` `useEffect` triggers `flyToWithOffset`.
3.  **App → Storage**: Confirmation → `AddressDetailsForm` → `localStorage`/Firebase stores `lastKnownLat/Lng` and saved addresses.

## 5. DO NOT TOUCH Rules

- **DO NOT** convert the fixed pin into a Leaflet marker. The "Map Moves, Pin Stays" pattern is core to the UX design and alignment with `pinY`.
- **DO NOT** remove the `invalidateSize()` calls. Leaflet requires these to re-render tiles correctly after the parent container changes height (bottom sheet transitions).
- **DO NOT** remove the interaction mask in `CompactHomeMap`. It prevents the user from accidentally scrolling the map while trying to scroll the home page.
- **DO NOT** change the `Nominatim` User-Agent header (`Lbricol/1.0`); it is required for free-tier compliance.

## 6. Known Bugs & Limitations

- **Nominatim Latency**: Reverse geocoding can take 500ms-1s. The UI shows "Loading address..." during this phase.
- **Zero Coordinates**: On first load, if geolocation is denied and no history exists, the map defaults to Essaouira (31.50, -9.75).
- **Z-Index Layering**: The map lives at `z-0` or `z-10` while pins and bubbles live at `z-[1000+]`. Extreme care must be taken when adding new high-level overlays (like Modals or Toasts) to avoid being buried under the map.
