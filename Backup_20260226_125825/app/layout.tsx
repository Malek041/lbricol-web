import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "@fontsource/inclusive-sans";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Lbricol | Expert Help, Right Away",
  description: "Connect with local experts for handyman work, home services, and more in Morocco.",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning={true} className={`${outfit.variable} font-sans antialiased bg-white text-gray-900`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
