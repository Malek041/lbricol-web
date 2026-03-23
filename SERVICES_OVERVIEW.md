# Lbricol.ma Services & Subservices Overview

This document provides a complete list of all services and subservices available on the Lbricol platform, as defined in `src/config/services_config.ts`, along with their pricing models.

## 💰 Pricing & Fee Structure

The platform uses **Pricing Archetypes** to calculate costs automatically:

1.  **Hourly (`hourly`)**: Price = `Rate × Hours`.
2.  **Fixed (`fixed`)**: Price = `Rate × 1` (Standard Flat Fee).
3.  **Unit (`unit`)**: Price = `Rate × Units` (e.g., Number of Rooms).
4.  **Rental (`rental`)**: Price = `Rate × Days`.

### ⚡ Lbricol Service Fee
A **10% service fee** is added to every order subtotal (rounded to the nearest whole number).

---

## 1. Core Services (Immediate/Binary Success)

### Furniture Assembly
- **General Furniture Assembly** (`hourly`)
- **IKEA / Flat-Pack Assembly** (`fixed`)
- **Crib Assembly** (`fixed`)
- **Bookshelf Assembly** (`fixed`)
- **Desk Assembly** (`fixed`)

### Moving Help
- **Local Moving** (`hourly`)
- **Packing Services** (`hourly`)
- **Furniture Moving Only** (`hourly`)

### Handyman
- **General Repairs** (`hourly`)
- **Door & Lock Repair** (`fixed`)
- **Furniture Fixes** (`fixed`)
- **Shelf Mounting** (`fixed`)
- **Caulking & Grouting** (`hourly`)

### Mounting
- **TV Mounting** (`fixed`)
- **Shelf Installation** (`fixed`)
- **Curtain Rod Installation** (`fixed`)
- **Mirror Hanging** (`fixed`)
- **Picture Hanging** (`fixed`)

---

## 2. Home Infrastructure & Restoration

### Plumbing
- **Leak Repair** (`hourly`)
- **Pipe Installation** (`fixed`)
- **Drain Cleaning** (`fixed`)
- **Faucet Repair** (`fixed`)
- **Toilet Repair** (`fixed`)

### Electricity
- **Wiring & Rewiring** (`hourly`)
- **Outlet Installation** (`fixed`)
- **Light Fixture Installation** (`fixed`)
- **Circuit Breaker Repair** (`fixed`)
- **Heating/cooling systems** (`hourly`)
- **EVs charger** (`fixed`)
- **Camera installation** (`fixed`)

### Painting
- **Indoor Painting** (`unit`)
- **Wallpapering** (`unit`)
- **Outdoor Painting** (`unit`)
- **Concrete & Brick Painting** (`unit`)
- **Accent Wall Painting** (`unit`)
- **Wallpaper Removal** (`unit`)

### Home Repairs (Appliance Installation)
- **Door, Cabinet, & Furniture Repair** (`fixed`)
- **Wall Repair** (`fixed`)
- **Sealing & Caulking** (`fixed`)
- **Appliance Installation & Repairs** (`fixed`)
- **Window & Blinds Repair** (`fixed`)
- **Flooring & Tiling Help** (`hourly`)
- **Electrical Help** (`hourly`)
- **Plumbing Help** (`hourly`)
- **Light Carpentry** (`hourly`)
- **Window Winterization** (`fixed`)

---

## 3. Recurring Maintenance & Errands

### Cleaning
- **Family Home Cleaning** (`unit`)
- **Airbnb Cleaning** (`unit`)
- **Car Washing** (`fixed`)
- **Car Detailing** (`fixed`)
- **Deep Home Cleaning** (`unit`)

### Errands
- **Grocery Shopping** (`fixed`)
- **Pharmacy Pickup** (`fixed`)
- **General Pickup & Drop-off** (`fixed`)
- **Post Office / Mailing** (`fixed`)
- **In-store Returns** (`fixed`)

### Glass Cleaning
- **Residential Glass** (`unit`)
- **Commercial/Office Glass** (`unit`)
- **Automotive Glass** (`fixed`)
- **Specialty/Hard-to-Clean Glass** (`hourly`)
- **Alternative Surfaces** (`hourly`)

### Gardening
- **Lawn Mowing** (`hourly`)
- **Tree Trimming** (`hourly`)
- **Planting & Landscaping** (`hourly`)

---

## 4. High-Trust & Niche Services

### Babysitting
- **Regular Babysitting** (`hourly`)
- **After-School Care** (`hourly`)
- **Night Sitting** (`hourly`)
- **Day Out Supervision** (`hourly`)

### Pool Cleaning
- **Chemical Balancing** (`fixed`)
- **Skimming & Vacuuming** (`hourly`)
- **Filter Cleaning** (`fixed`)
- **Opening / Closing** (`fixed`)
- **Tile & Wall Brushing** (`hourly`)

### Pets Care
- **Dog Walking** (`hourly`)
- **Pet Sitting** (`hourly`)
- **Pet Grooming** (`fixed`)
- **Feeding & Check-ins** (`fixed`)
- **Pet Transportation** (`fixed`)

### Elderly Care
- **Companionship & Visits** (`hourly`)
- **Personal Assistance** (`hourly`)
- **Medication Reminders** (`fixed`)
- **Meal Preparation** (`fixed`)
- **Light Housekeeping** (`hourly`)
- **Transportation & Errands** (`fixed`)

---

## 5. Go Services (Transportation & Logistics)

### Car with driver
- **Hourly Service** (`hourly`)
- **Daily Service** (`rental`)
- **Event Transportation** (`fixed`)

### Car rental
- **Rent a car** (`rental`)

### Courier / delivery
- **Public Bidding Flow**

### Airport pickup
- **Public Bidding Flow**

### Intercity transport
- **Public Bidding Flow**

---

## 6. Lifestyle & Experience

### Cooking
- **Breakfast** (`fixed`)
- **Lunch** (`fixed`)
- **Dinner** (`fixed`)
- **Moroccan Cooking Class** (`fixed`)
- **Private Chef at Home** (`hourly`)
- **Moroccan Pastry Workshop** (`fixed`)
- **Market Tour & Cooking** (`fixed`)

### Private Driver
- **Half-Day City Driver** (`rental`)
- **Full-Day City Driver** (`rental`)
- **VIP Airport Transfer** (`fixed`)
- **Intercity Trip Driver** (`rental`)

### Learn Arabic
- **Intro to Moroccan Darija** (`hourly`)
- **Conversational Practice** (`hourly`)
- **Arabic Calligraphy Intro** (`hourly`)
- **Survival Arabic for Tourists** (`hourly`)

### Tour Guide
- **City Tour** (`hourly`)
- **Historical Sites Tour** (`hourly`)
- **Moroccan Food Tour** (`fixed`)
- **Medina Shopping Guide** (`hourly`)

---
*Last Updated: March 2026*
