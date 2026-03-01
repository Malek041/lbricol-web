# Lbricol.ma Design Style Guidelines

## Overview
Lbricol.ma follows a **minimalist, Uber-inspired design system** with clean lines, generous white space, and subtle interactions. The interface prioritizes clarity, speed, and a premium feel while maintaining accessibility across devices.

---

## 1. Color Palette

### Primary Colors
- **Black**: `#000000` - Primary brand color, used for CTAs, headings, and key UI elements
- **White**: `#FFFFFF` - Background and contrast color
- **Gray Scale**:
  - `#F3F3F3` - Light surface backgrounds (input fields, cards)
  - `#F5F5F5` - Subtle surface variations
  - `#FAFAFA` - Secondary background
  - `#E2E2E2` - Borders and dividers
  - `#5E5E5E` - Muted text, placeholders
  - `#868686` - Secondary text
  - `#A0A0A0` - Disabled states, tertiary text
  - `#C0C0C0` - Light borders

### Accent Colors
- **Success Green**: `#06C167` - Accepted offers, positive actions
- **Purple**: `#5856D6` - Counter offers, secondary actions
- **Red**: `#FF3B30` - Errors, warnings, fully booked indicators
- **Blue**: `#007AFF` - Links, information badges
- **Yellow**: `#FFCC00` - Ratings, highlights

### Theme Support
The application supports both light and dark themes with the following mappings:

**Light Theme:**
```javascript
{
  bg: '#FFFFFF',
  bgSecondary: '#FAFAFA',
  text: '#000000',
  textMuted: '#545454',
  border: '#E2E2E2',
  card: '#FFFFFF',
  surface: '#F5F5F5'
}
```

**Dark Theme:**
```javascript
{
  bg: '#000000',
  bgSecondary: '#0D0D0D',
  text: '#FFFFFF',
  textMuted: '#A0A0A0',
  border: '#2D2D2D',
  card: '#1A1A1A',
  surface: '#111111'
}
```

---

## 2. Typography

### Font Family
- **Primary**: `"Uber Move"` - Used for all headings and brand elements
- **Fallback Stack**: `"Outfit", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", "Arial", sans-serif`

### Font Weights
- **400**: Regular body text
- **500**: Medium - secondary text, labels
- **600**: Semi-bold - emphasized text
- **700**: Bold - buttons, important labels
- **800**: Extra bold - section headings, titles
- **900/950**: Black - hero text, primary headings

### Font Sizes & Hierarchy

**Hero Section:**
- Desktop: `4rem` (64px) - Main headline
- Mobile: `2.5rem` (40px) - Main headline
- Letter spacing: `-0.04em` (tight)

**Section Headings:**
- Desktop: `2.5rem` (40px)
- Mobile: `1.75rem` (28px)
- Font weight: `800`
- Letter spacing: `-0.02em`

**Card Titles:**
- `1.25rem` (20px)
- Font weight: `800`
- Text transform: `uppercase` (for labels)

**Body Text:**
- `16px` - Standard body
- `14px` - Secondary text, labels
- `13px` - Small text, captions
- `12px` - Micro text, badges
- Line height: `1.6` for paragraphs

**Buttons:**
- Primary: `18px`, weight `700`
- Secondary: `14-15px`, weight `700-800`
- Small: `13px`, weight `800`

---

## 3. Spacing System

### Base Unit
The design uses an **8px base unit** for consistent spacing:
- `0.5rem` (8px) - Tight spacing
- `0.75rem` (12px) - Small gaps
- `1rem` (16px) - Standard spacing
- `1.5rem` (24px) - Medium spacing
- `2rem` (32px) - Large spacing
- `3rem` (48px) - Section spacing
- `4rem` (64px) - Major section breaks
- `5rem` (80px) - Hero section padding
- `6rem` (96px) - Large section padding

### Component Spacing
- **Input fields**: `16px 20px` padding
- **Buttons**: `14-16px 20-24px` padding
- **Cards**: `1.5-2rem` padding
- **Modals**: `2rem` padding
- **Container max-width**: `1270-1280px`
- **Container padding**: `0 1.5rem` (24px horizontal)

---

## 4. Border Radius

### Hierarchy
- **Small elements**: `8px` - Time slots, small buttons
- **Medium elements**: `10-12px` - Input fields, standard buttons
- **Large cards**: `16-24px` - Cards, modals
- **Extra large**: `40px` - Notification cards, special containers
- **Circular**: `50%` - Avatar buttons, icon buttons
- **Pills**: `100px` - Badge elements, tags

### Specific Components
- Input fields: `10px`
- Primary buttons: `10px`
- Service cards: `12px`
- Calendar container: `24px`
- Notification cards: `40px`
- Profile avatars: `24px` (rounded square) or `50%` (circle)

---

## 5. Shadows & Elevation

### Shadow Levels
```css
/* No shadow - Flat design (default) */
box-shadow: none;

/* Subtle hover */
box-shadow: 0 2px 8px rgba(0,0,0,0.05);

/* Light elevation */
box-shadow: 0 2px 8px rgba(0,0,0,0.08);

/* Medium elevation */
box-shadow: 0 4px 12px rgba(0,0,0,0.12);

/* High elevation - Modals */
box-shadow: 0 8px 32px rgba(0,0,0,0.2);

/* Maximum elevation - Notifications */
box-shadow: 0 40px 100px rgba(0,0,0,0.25);

/* Header shadow (when scrolled) */
box-shadow: 0 4px 12px rgba(0,0,0,0.05);
```

### Usage Guidelines
- **Default state**: No shadow (flat design)
- **Hover states**: Subtle shadow `0 2px 8px rgba(0,0,0,0.05)`
- **Floating elements**: Medium shadow
- **Modals/Overlays**: High shadow
- **Critical notifications**: Maximum shadow

---

## 6. Buttons

### Primary Button
```css
background: #000000;
color: #FFFFFF;
padding: 16px 24px;
border-radius: 10px;
font-size: 18px;
font-weight: 700;
border: none;
cursor: pointer;
transition: all 0.2s ease;
```

**Hover**: `background: #333333`
**Disabled**: `background: #E0E0E0`, `color: #A0A0A0`

### Secondary Button
```css
background: #F3F3F3;
color: #000000;
padding: 12px 20px;
border-radius: 10px;
font-size: 14px;
font-weight: 800;
border: 1px solid #E2E2E2;
```

### Icon Buttons
```css
width: 40px;
height: 40px;
border-radius: 50%;
background: #F3F3F3;
display: flex;
align-items: center;
justify-content: center;
```

### Button States
- **Default**: Flat, no shadow
- **Hover**: `scale(1.02)` or background color change
- **Active/Tap**: `scale(0.98)`
- **Disabled**: Reduced opacity, `cursor: not-allowed`

---

## 7. Input Fields

### Standard Input (Uber Style)
```css
padding: 16px 20px;
background: #F3F3F3;
border-radius: 10px;
border: 2px solid transparent;
font-size: 16px;
font-weight: 500;
transition: background-color 0.2s ease;
```

**Focus/Active State:**
```css
border: 2px solid black;
background: #EDEDED;
```

### Input Structure
- **Dot indicator**: `8px` circle, black
- **Label spacing**: `16px` gap between icon and text
- **Placeholder color**: `#5E5E5E`
- **Input text color**: `#000000`

---

## 8. Cards & Containers

### Service Selection Cards
```css
background: #FFFFFF;
border: 1px solid #E2E2E2;
border-radius: 12px;
padding: 20px 24px;
box-shadow: none; /* Flat look */
transition: background-color 0.2s ease;
```

**Hover**: `background: #F9F9F9`

### Calendar Container
```css
background: #FFFFFF;
border: 1px solid #E2E2E2;
border-radius: 24px;
padding: 1.5rem;
box-shadow: none;
```

### Extra Details Cards
```css
background: #F3F3F3;
border-radius: 20px;
padding: 2rem;
border: none;
```

### Notification Cards
```css
background: #FFFFFF;
border-radius: 40px;
padding: 2rem;
box-shadow: 0 40px 100px rgba(0,0,0,0.25);
border: 3px solid [accent-color];
```

---

## 9. Animations & Transitions

### Standard Transitions
```css
transition: all 0.2s ease;
transition: background-color 0.2s ease;
transition: transform 0.2s ease;
```

### Framer Motion Variants

**Hero Section:**
```javascript
heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
}

heroItemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: "spring",
      stiffness: 70,
      damping: 15,
      mass: 1
    }
  }
}
```

**Modal Animations:**
```javascript
initial={{ opacity: 0, y: 100, scale: 0.9, rotate: -5 }}
animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
exit={{ opacity: 0, y: 100, scale: 0.9, rotate: -5 }}
transition={{ type: "spring", damping: 25, stiffness: 300 }}
```

**Hover Effects:**
```javascript
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
whileHover={{ backgroundColor: '#EDEDED' }}
```

### Loading Spinners
```css
/* Circular spinner */
border: 2.5px solid #FFF;
border-top-color: transparent;
border-radius: 50%;
animation: rotate 360deg 1s linear infinite;
```

---

## 10. Icons

### Icon Library
- **Primary**: Lucide React icons
- **Service Icons**: React Icons (Font Awesome 6)

### Icon Sizes
- Small: `16px`
- Medium: `18-20px`
- Large: `24px`
- Extra large: `28-32px`

### Icon Styling
```css
stroke-width: 2;
color: [theme-text-color];
```

**Icon Buttons:**
- Container: `40px × 40px`
- Icon size: `18px`

---

## 11. Calendar Design

### Calendar Grid
```css
display: grid;
grid-template-columns: repeat(7, 1fr);
gap: 8px;
```

### Day Cell
```css
aspect-ratio: 1;
border-radius: 8px;
font-size: 14px;
font-weight: 600;
display: flex;
align-items: center;
justify-content: center;
```

**Selected State:**
```css
background: #000;
color: #FFF;
```

**Today Indicator:**
```css
border: 2px solid #000;
```

**Disabled/Past:**
```css
opacity: 0.4;
cursor: not-allowed;
color: #CCC;
```

### Time Slots
```css
display: grid;
grid-template-columns: repeat(4, 1fr);
gap: 8px;
```

**Time Button:**
```css
padding: 12px 0;
border-radius: 8px;
font-size: 12px;
font-weight: 700;
background: #F3F3F3; /* Unselected */
background: #000000; /* Selected */
color: #FFFFFF; /* Selected */
```

---

## 12. Header

### Desktop Header
```css
position: sticky;
top: 0;
z-index: 1000;
background: [theme-bg];
padding: 1rem 1.5rem;
border-bottom: 1px solid [theme-border]; /* When scrolled */
box-shadow: 0 4px 12px rgba(0,0,0,0.05); /* When scrolled */
```

### Mobile Header
```css
padding: 0.75rem 1.5rem;
```

**Logo:**
- Desktop: `2rem` height
- Mobile: `1.75rem` height

**Hamburger Menu:**
- Position: `absolute`, `left: 16px`
- Size: `24px`
- Transform: `translateY(-50%)` for vertical centering

---

## 13. Responsive Breakpoints

### Breakpoints
- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

### Mobile Adaptations
- Logo centered in header
- Hamburger menu on left
- Full-width inputs
- Stacked layouts instead of side-by-side
- Reduced font sizes
- Smaller padding/margins
- Full-screen modals

---

## 14. Special Components

### Floating Calendar Button
```css
position: fixed;
bottom: 2.5rem;
right: 2.5rem;
width: 64px;
height: 64px;
background: #000;
border-radius: 50%;
color: #fff;
box-shadow: 0 8px 32px rgba(0,0,0,0.2);
z-index: 2000;
```

**Badge:**
```css
position: absolute;
top: -5px;
right: -5px;
width: 20px;
height: 20px;
background: #FF3B30;
border-radius: 50%;
border: 2px solid #fff;
font-size: 10px;
font-weight: 900;
```

### Notification Overlay
```css
position: fixed;
inset: 0;
z-index: 1000;
background: rgba(0,0,0,0.1);
backdrop-filter: blur(2px);
```

### Badge Elements
```css
/* Rating badge */
background: #FFCC00;
color: #000;
padding: 3px 8px;
border-radius: 12px;
font-size: 11px;
font-weight: 900;
border: 1.5px solid #FFF;
box-shadow: 0 4px 10px rgba(0,0,0,0.2);
```

---

## 15. Design Principles

### 1. **Minimalism First**
- Remove unnecessary borders
- Use flat design (no shadows by default)
- Generous white space
- Clean, uncluttered layouts

### 2. **Uber-Inspired Aesthetics**
- Bold, black primary actions
- Light gray backgrounds for inputs
- Rounded corners (not too round)
- Dot indicators for steps
- Uppercase labels for sections

### 3. **Smooth Interactions**
- All transitions: `0.2s ease`
- Hover states: subtle scale or color change
- Loading states: clean spinners
- Spring animations for modals

### 4. **Typography Hierarchy**
- Clear size differences between levels
- Consistent font weights
- Negative letter spacing for headings
- Uber Move for brand elements

### 5. **Color Usage**
- Black & white as primary
- Accent colors sparingly
- Consistent semantic colors (green = success, red = error)
- Theme-aware color variables

### 6. **Accessibility**
- Sufficient contrast ratios
- Touch-friendly sizes (min 40px)
- Clear focus states
- Readable font sizes (min 12px)

### 7. **Mobile-First Responsive**
- Stack layouts on mobile
- Larger touch targets
- Simplified navigation
- Full-screen modals

---

## 16. Component Patterns

### Search/Input Flow
1. Vertical stack of input fields
2. Each field has dot indicator on left
3. Active field has black border
4. Hover changes background to `#EDEDED`
5. Right panel shows contextual preview

### Modal Pattern
1. Backdrop: `rgba(0,0,0,0.4)` with blur
2. Modal: Spring animation from bottom
3. Close on backdrop click
4. Smooth exit animation

### Card Hover Pattern
1. Default: Flat, no shadow
2. Hover: `background: #F9F9F9` or subtle shadow
3. Active: `scale(0.99)`

### Loading States
1. Skeleton screens with shimmer
2. Circular spinners for actions
3. Full-screen overlay for critical operations

---

## 17. Z-Index Hierarchy

```
1. Base content: 0-10
2. Sticky header: 1000
3. Floating calendar: 2000
4. Calendar modal: 3000
5. Notifications: 1000
6. Full-screen loading: 9999
7. Mobile menu: 9999
```

---

## 18. Best Practices

### DO:
✅ Use theme-aware color variables
✅ Maintain consistent spacing (8px grid)
✅ Apply smooth transitions (0.2s)
✅ Use Uber Move for headings
✅ Keep designs flat (no shadows by default)
✅ Use semantic colors consistently
✅ Test on mobile devices
✅ Ensure touch targets are 40px+

### DON'T:
❌ Use random spacing values
❌ Mix different animation durations
❌ Add shadows everywhere
❌ Use too many accent colors
❌ Ignore mobile breakpoints
❌ Use small touch targets
❌ Forget hover states
❌ Overcomplicate layouts

---

## 19. File Structure

```
src/
├── app/
│   ├── globals.css          # Global styles, theme variables
│   └── page.tsx              # Main client interface
├── components/
│   ├── Header.tsx            # Sticky header with mobile menu
│   ├── Footer.tsx
│   ├── WeekCalendar.tsx      # Calendar component
│   ├── OrderCard.tsx
│   └── [other components]
└── context/
    ├── ThemeContext.tsx      # Theme management
    └── LanguageContext.tsx   # i18n support
```

---

## 20. Code Examples

### Theme-Aware Component
```tsx
const { theme } = useTheme();
const c = {
  bg: theme === 'light' ? '#FFFFFF' : '#000000',
  text: theme === 'light' ? '#000000' : '#FFFFFF',
  // ... other colors
};

<div style={{ backgroundColor: c.bg, color: c.text }}>
  Content
</div>
```

### Responsive Sizing
```tsx
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth < 768);
  onResize();
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}, []);

<h1 style={{ fontSize: isMobile ? '2.5rem' : '4rem' }}>
  Headline
</h1>
```

### Animated Button
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  style={{
    padding: '16px 24px',
    background: '#000',
    color: '#FFF',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}
>
  Click Me
</motion.button>
```

---

## Summary

Lbricol.ma's design system emphasizes **clarity, speed, and premium aesthetics** through:
- Minimalist, Uber-inspired visual language
- Consistent 8px spacing grid
- Bold typography with Uber Move font
- Smooth, spring-based animations
- Theme-aware color system
- Mobile-first responsive design
- Flat design with strategic use of shadows
- Clean, accessible interactions

This creates a **professional, modern interface** that feels fast, trustworthy, and easy to use across all devices.
