# 🏗️ Lbricol.ma — Technical Architecture & UX Overview

Lbricol is a modern, full-stack marketplace platform designed to formalize and scale the home services economy in Morocco. It is built with a focus on high performance, real-time interactivity, and cross-platform accessibility.

---

## 🛠️ The Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | **Next.js 15+ (App Router)** & **React 19** |
| **Language** | **TypeScript** (Strict type safety across the board) |
| **Backend & Real-time** | **Firebase** (Firestore, Authentication, Cloud Storage, Functions) |
| **Mobile Integration** | **Capacitor** (Native bridges for Android and iOS) |
| **Styling** | **Tailwind CSS 4** & **Framer Motion** (Premium micro-animations) |
| **Maps & Location** | **Leaflet** with custom Moroccan Geo-configs |
| **Media Management** | **Cloudinary** (Auto-optimization & edge delivery) |

---

## 🚀 Core Technical Features

### 1. Dynamic Service Engine
The platform's heart is a hierarchical `ServiceConfig` system that manages 25+ major categories and 80+ specialized sub-services.
- **Pricing Archetypes**: Automated logic for `hourly`, `fixed`, `unit`, and `rental` models.
- **Service-Specific UI**: Dynamic form generation based on service type (e.g., room counters for painters vs. duration for nannies).

### 2. Intelligent Matching & Bidding
- **On-Demand Flow**: Real-time distribution of job requests to nearby verified professionals.
- **Public Bidding Engine**: A specialized flow for complex "Go Services" (Courier, Airport Transfers) where Bricolers bid on missions in real-time.

### 3. Geolocation & Accuracy
- **Hyper-Local Targeting**: Integrated mapping system with neighborhood-specific configurations for major Moroccan cities (Casablanca, Marrakech, Rabat, etc.).
- **Entrance Picking**: A "Mark Your Entrance" feature that ensures service providers find the exact building door, not just a general street address.

### 4. Multilingual & RTL Support
- Built from day one with **i18n** supporting English, French, and **Arabic (Native RTL)**.
- Full layout mirroring for Arabic users, ensuring a premium experience for the entire Moroccan demographic.

---

## ✨ Ease of Use (UX Philosophy)

### 1. The "Two-Minute" Booking
The client flow is optimized to reduce friction:
- **Zero-Search Discovery**: Visual category navigation.
- **Live Maps**: Instant visibility of active professionals in the area.
- **Transparent Pricing**: No haggling; all costs and fees (15% platform fee) are calculated upfront.

### 2. Standardized Trust
- **Professional Portfolios**: Bricolers manage their identities with work photos, specialized skills, and verified ratings.
- **In-App Communication**: Real-time messaging and order tracking keep both parties in sync without leaving the platform.

### 3. Mobile-First Optimization
- **Progressive Web App (PWA)**: Desktop-class speed on mobile browsers.
- **Native Experience**: Simplified onboarding and push notifications via Capacitor integration.
- **Image Compression**: Client-side squoosh/sharp integration for fast photo uploads even on 3G/4G networks.

---

## 🔧 Infrastructure & Security
- **Firebase Security Rules**: Granular permissions for Firestore and Storage to protect user data.
- **Cloudinary Integration**: Automatic resizing and WebP conversion for all provider portfolio images.
- **Design System**: A custom-built design language (Lbricol Design System) ensuring consistency across order flows, admin dashboards, and provider portals.

---
*Document Version: 1.0.0 | March 2026*
