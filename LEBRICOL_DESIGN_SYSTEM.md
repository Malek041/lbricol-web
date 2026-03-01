# Lbricol App Design System (Enhanced)

## 1. Brand Core
Inspired by the Glovo Yellow System.

### Primary Colors
- **Primary:** `#FFC244` (Action / CTA)
- **Dark:** `#1E1E1E` (Text Primary)
- **Neutral 900:** `#2B2B2B`
- **Neutral 500:** `#9E9E9E`
- **Background:** `#F7F7F7`
- **Success:** `#2E7D32`
- **Error Soft:** `#FDECEA`
- **Error Text:** `#C62828`

**Yellow Usage Guidelines:**
Do not oversaturate yellow. Use only for:
- Primary buttons
- Price tags
- Active states

---

## 2. Typography System
### Hierarchy
- **H1:** 24–28px Bold → Screen status
- **H2:** 20px SemiBold → Section title
- **Body:** 16px Regular
- **Meta:** 13–14px Grey

### Rules
- Max 2 weights per screen
- No decorative fonts
- Numbers slightly heavier weight

---

## 3. Status System (Mandatory Component)
Each order state must have a clear visual representation.

| State | Icon | Background | Text Color |
| :--- | :--- | :--- | :--- |
| **Confirmed** | Check | Light Green | Dark |
| **Preparing** | Clock | Light Yellow | Dark |
| **Delivered** | Box | Light Green | Dark |
| **Cancelled** | Cross | Soft Red | Dark |

### Structure
1. [Icon]
2. Status Title
3. Timestamp
4. Short explanation

---

## 4. Transactional Screen Architecture
Strict structure with no deviation for predictability:
1. Header (Back + Help)
2. Status Block
3. Product List
4. Delivery Info
5. Summary
6. CTA (if applicable)

---

## 5. Spacing & Layout Grid
Use an **8pt system**:
- **XS:** 4px
- **S:** 8px
- **M:** 16px
- **L:** 24px
- **XL:** 32px

**Card radius:**
- 12px for containers
- 24px for modals

---

## 6. Pricing Component Standard
### Structure
- Product price
- Delivery fee
- Discount
- Divider
- **TOTAL (Bold)**

**Rules:**
- TOTAL font = 1.3x Body
- Always right-aligned

---

## 7. Error & Recovery UX
Never show an error without a next action.
*Example (Cancelled order screen):*
- Reorder button
- Contact support
- Reason if available

*Silence creates distrust.*

---

## 8. Order History View
### Design Logic
- Thumbnail left
- Title bold
- Short description
- Status tag small

**Status tag style:**
- Filled pill style
- 12px radius

---

## 9. Emotional UX Principles
- **Clarity** over beauty
- **Contrast** over decoration
- **Spacing** over borders
- **Status** over content
- **Total** over breakdown

*If the user hesitates → design failed.*

---

## 10. Strategic Upgrade
Enhance trust for hardware/tools oriented tasks:
- **Estimated delivery window visibility**
- **Stock availability label**
- **Store location distance**
- **Warranty tag** if applicable

---

## Final Structural Principle
Transactional screens are **reassurance systems**, not marketing surfaces.
If the user opens it, they want:
- **Certainty**, not design creativity.
- Keep it **rigid**.
- Keep it **predictable**.
- Keep it **fast**.
