import type { Metadata } from "next";
import "./globals.css";

import { Outfit, Playfair_Display, Afacad, Inter } from "next/font/google";

import { PostHogProvider } from "@/components/PostHogProvider";
import { Toaster } from "sonner";
import { PingBackend } from "@/components/PingBackend";
import CookiesBanner from "@/components/CookiesBanner";
import { LazyMotion, domAnimation } from 'framer-motion'
import ProgressBar from '@/components/ProgressBar'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

const afacad = Afacad({
  subsets: ["latin"],
  variable: "--font-afacad",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  // TODO: confirm production domain — no NEXT_PUBLIC_SITE_URL/similar env var found in this codebase; using realtypals.com as a placeholder (matches storage.realtypals.com already referenced in next.config.js).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://realtypals.com'),
  title: {
    default: "RealtyPals — AI Property Advisor for Noida",
    template: "%s | RealtyPals",
  },
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
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RealtyPals',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover' as const,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable} ${playfair.variable} ${afacad.variable} font-sans`}>
      <head>
        {/* Applies the stored theme before first paint. ThemeToggle sets it in a
            useEffect, which runs after hydration — so dark-mode users got a
            white flash on every navigation. Must stay in sync with ThemeToggle:
            light is the default, dark only when explicitly stored. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased glass-app font-sans relative text-foreground bg-[#E4E4E5]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-white focus:text-blue-600 focus:font-bold">
          Skip to main content
        </a>
        <ProgressBar />
        <PingBackend />
        <LazyMotion features={domAnimation}>
          <PostHogProvider>{children}</PostHogProvider>
        </LazyMotion>
        <Toaster position="bottom-right" richColors closeButton theme="light" />
        <CookiesBanner />

      </body>
    </html>
  );
}
