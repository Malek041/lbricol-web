import type { Metadata } from "next";
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
import PWAPrompt from "@/components/shared/PWAPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning={true} className={`${inter.variable} ${plusJakartaSans.variable} ${inclusiveSans.variable} ${notoSansArabic.variable} font-sans antialiased bg-white text-gray-900`}>
        <Providers>
          {children}
          <PWAPrompt />
        </Providers>
      </body>
    </html>
  );
}
