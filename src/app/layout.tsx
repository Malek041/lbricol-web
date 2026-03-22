import type { Metadata } from "next";
import { Noto_Sans_Arabic, Fredoka, Plus_Jakarta_Sans } from "next/font/google";
import "@fontsource/inclusive-sans";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"],
});

const fredokaBold = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka-bold",
  weight: "700",
});

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
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
      <body suppressHydrationWarning={true} className={`${fredoka.variable} ${fredokaBold.variable} ${plusJakartaSans.variable} ${notoSansArabic.variable} font-sans antialiased bg-white text-gray-900`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
