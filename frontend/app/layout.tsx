import type { Metadata } from "next";
import "./globals.css";

import { Outfit } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "RealtyPal - Property Discovery",
  description: "Chatbot validation and property discovery",
  icons: {
    icon: "/images/logo/favicon.png",
    shortcut: "/images/logo/favicon.png",
    apple: "/images/logo/favicon.png",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} font-sans`}>
      <body className="antialiased glass-app font-sans">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
