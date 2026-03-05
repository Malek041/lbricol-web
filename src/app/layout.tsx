import type { Metadata } from "next";
import { Noto_Sans_Arabic, Outfit } from "next/font/google";
import "@fontsource/inclusive-sans";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Lbricol | Expert Help, Right Away | Aide experte, tout de suite",
  description: "Connect with local experts in Morocco | Connectez-vous avec des experts locaux au Maroc",
  icons: {
    icon: "/Images/Logo/theEggOfLB.png",
    shortcut: "/Images/Logo/theEggOfLB.png",
    apple: "/Images/Logo/theEggOfLB.png",
  },
};

import { Providers } from "@/components/shared/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning={true} className={`${outfit.variable} ${notoSansArabic.variable} font-sans antialiased bg-white text-gray-900`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
