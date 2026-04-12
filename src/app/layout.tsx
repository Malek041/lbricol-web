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
  metadataBase: new URL("https://lbricol.ma"),
  title: "Lbricol | Expert Help, Right Away | Aide experte, tout de suite",
  description: "Connect with local experts in Morocco | Connectez-vous avec des experts locaux au Maroc",
  keywords: ["morocco", "handyman", "services", "cleaning", "plumbing", "moving", "lbricol", "bricolage"],
  manifest: "/manifest.json",
  icons: {
    icon: "/Images/Logo/image-Photoroom (2) copy 5.png",
    shortcut: "/Images/Logo/image-Photoroom (2) copy 5.png",
    apple: "/Images/Logo/image-Photoroom (2) copy 5.png",
  },
  openGraph: {
    title: "Lbricol | Expert Help, Right Away",
    description: "Book trusted local professionals for cleaning, repair, and lifestyle services in Morocco.",
    url: "https://lbricol.ma",
    siteName: "Lbricol",
    images: [
      {
        url: "/Images/Logo/image-Photoroom (2) copy 5.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lbricol | Expert Help, Right Away",
    description: "Connect with local experts in Morocco for cleaning, repair, and lifestyle services.",
    images: ["/Images/Logo/image-Photoroom (2) copy 5.png"],
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
    "image": "https://lbricol.ma/Images/Logo/image-Photoroom (2) copy 5.png",
    "description": "Connect with local experts in Morocco for cleaning, repair, moving, and more.",
    "url": "https://lbricol.ma",
    "areaServed": "Morocco"
  };

  return (
    <html lang="en" suppressHydrationWarning>
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
