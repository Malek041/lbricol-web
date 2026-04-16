import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic, Inter, Plus_Jakarta_Sans, Inclusive_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const inclusiveSans = Inclusive_Sans({
  subsets: ["latin"],
  variable: "--font-inclusive-sans",
  weight: ["400"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFC244",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://lbricol.com"),
  title: {
    default: "Lbricol — Services à domicile au Maroc | Nettoyage, Plomberie, Déménagement",
    template: "%s | Lbricol Maroc",
  },
  description:
    "Réservez des professionnels de confiance au Maroc pour le nettoyage, la plomberie, l'électricité, le déménagement et plus encore. Intervention rapide à Marrakech, Casablanca, Agadir, Essaouira, Rabat.",
  // Note: 'keywords' is ignored by Google but kept for other search engines
  keywords: [
    "services à domicile maroc",
    "nettoyage domicile marrakech",
    "plombier casablanca",
    "déménagement maroc",
    "bricolage maroc",
    "femme de ménage marrakech",
    "electricien agadir",
    "handyman morocco",
    "home services morocco",
    "lbricol",
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://lbricol.com",
    languages: {
      "fr-MA": "https://lbricol.com",
      "ar-MA": "https://lbricol.com",
    },
  },
  icons: {
    icon: "/Images/Logo/image-Photoroom (2) copy 5.png",
    shortcut: "/Images/Logo/image-Photoroom (2) copy 5.png",
    apple: "/Images/Logo/image-Photoroom (2) copy 5.png",
  },
  openGraph: {
    title: "Lbricol — Services à domicile au Maroc",
    description:
      "Réservez des professionnels locaux de confiance pour le nettoyage, la réparation et les services à domicile au Maroc.",
    url: "https://lbricol.com",
    siteName: "Lbricol",
    images: [
      {
        url: "/Images/Logo/image-Photoroom (2) copy 5.png",
        width: 1200,
        height: 630,
        alt: "Lbricol — Services à domicile au Maroc",
      },
    ],
    locale: "fr_MA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lbricol — Services à domicile au Maroc",
    description:
      "Nettoyage, plomberie, électricité, déménagement et plus encore. Professionnels vérifiés au Maroc.",
    images: ["/Images/Logo/image-Photoroom (2) copy 5.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "J29j-9JPoP2AZWvlSY19jVzxQoz7duxZHYveO6cWvng",
  },
};

import { Providers } from "@/components/shared/Providers";
import PWAPrompt from "@/components/shared/PWAPrompt";
import { GoogleAnalytics } from "@next/third-parties/google";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Lbricol",
    "image": "https://lbricol.com/Images/Logo/image-Photoroom%20(2)%20copy%205.png",
    "description": "Réservez des professionnels locaux de confiance pour le nettoyage, la réparation, la plomberie, l'électricité et le déménagement au Maroc.",
    "url": "https://lbricol.com",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "MA",
      "addressRegion": "Marrakech-Safi"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      "opens": "07:00",
      "closes": "22:00"
    },
    "areaServed": [
      { "@type": "City", "name": "Marrakech", "containedInPlace": { "@type": "AdministrativeArea", "name": "Marrakech-Safi" } },
      { "@type": "City", "name": "Casablanca", "containedInPlace": { "@type": "AdministrativeArea", "name": "Casablanca-Settat" } },
      { "@type": "City", "name": "Agadir", "containedInPlace": { "@type": "AdministrativeArea", "name": "Souss-Massa" } },
      { "@type": "City", "name": "Essaouira", "containedInPlace": { "@type": "AdministrativeArea", "name": "Marrakech-Safi" } },
      { "@type": "City", "name": "Rabat", "containedInPlace": { "@type": "AdministrativeArea", "name": "Rabat-Salé-Kénitra" } },
      { "@type": "City", "name": "Tanger", "containedInPlace": { "@type": "AdministrativeArea", "name": "Tanger-Tétouan-Al Hoceima" } },
      { "@type": "City", "name": "Fès", "containedInPlace": { "@type": "AdministrativeArea", "name": "Fès-Meknès" } },
      { "@type": "City", "name": "Meknès", "containedInPlace": { "@type": "AdministrativeArea", "name": "Fès-Meknès" } }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services à domicile au Maroc",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Nettoyage à domicile", "url": "https://lbricol.com/services/cleaning" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Plomberie", "url": "https://lbricol.com/services/plumbing" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Électricité", "url": "https://lbricol.com/services/electricity" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Déménagement", "url": "https://lbricol.com/services/moving" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Jardinage", "url": "https://lbricol.com/services/gardening" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Bricolage & Réparations", "url": "https://lbricol.com/services/home_repairs" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Garde d'enfants", "url": "https://lbricol.com/services/babysitting" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Peinture", "url": "https://lbricol.com/services/painting" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Guide touristique", "url": "https://lbricol.com/services/tour_guide" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Chef à domicile", "url": "https://lbricol.com/services/cooking" } }
      ]
    },
    "sameAs": [
      "https://lbricol.com"
    ]
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning={true} className={`${inter.variable} ${plusJakartaSans.variable} ${inclusiveSans.variable} ${notoSansArabic.variable} font-sans antialiased bg-white text-gray-900`}>
        <Providers>
          {children}
          <PWAPrompt />
        </Providers>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX"} />
      </body>
    </html>
  );
}
