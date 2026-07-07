import type { Metadata } from "next";
import "./globals.css";

import { Outfit, Playfair_Display, Afacad } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const afacad = Afacad({
  subsets: ["latin"],
  variable: "--font-afacad",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "RealtyPals — AI Property Advisor for Noida",
  description: "Find, compare, and evaluate Noida real estate with AI. Get honest project analysis, EMI calculations, and builder track records — in plain language.",
  keywords: ["Noida real estate", "property advisor", "AI property search", "buy flat Noida", "Sector 150", "RERA registered"],
  openGraph: {
    title: "RealtyPals — AI Property Advisor for Noida",
    description: "Find, compare, and evaluate Noida real estate with AI.",
    type: "website",
  },
  icons: {
    icon: "/images/icons/faviconBlack.svg",
    shortcut: "/images/icons/faviconBlack.svg",
    apple: "/images/icons/faviconBlack.svg",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
};

import { Toaster } from "sonner";
import { PingBackend } from "@/components/PingBackend";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${playfair.variable} ${afacad.variable} font-sans`}>
      <body className="antialiased glass-app font-sans relative text-foreground text-slate-800 bg-[#E4E4E5]">
        <PingBackend />
        <div className="noise-overlay" />
        <PostHogProvider>{children}</PostHogProvider>
        <Toaster position="bottom-right" richColors closeButton theme="light" />
      </body>
    </html>
  );
}
