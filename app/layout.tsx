import type { Metadata, Viewport } from "next";
import { Syne, Nunito } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/lib/auth";
import CartDrawer from "@/components/CartDrawer";
import CookieBanner from "@/components/CookieBanner";
import { GoogleAnalytics } from "@next/third-parties/google";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Vivo Wine Club",
  description:
    "The exclusive club for wine lovers. Tastings, winery tours and access to the world's rarest and finest wines.",
  icons: {
    icon:       '/vivo-favicon.png',
    shortcut:   '/vivo-favicon.png',
    apple:      '/vivo-favicon.png',
  },
  openGraph: {
    title:       'Vivo Wine Club',
    description: "The exclusive club for wine lovers. Tastings, winery tours and access to the world's rarest and finest wines.",
    url:         'https://www.vivowineclub.com',
    siteName:    'Vivo Wine Club',
    images: [
      {
        url:    '/vivo-favicon.png',
        width:  1200,
        height: 1200,
        alt:    'Vivo Wine Club',
      },
    ],
    type: 'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Vivo Wine Club',
    description: "The exclusive club for wine lovers. Tastings, winery tours and access to the world's rarest and finest wines.",
    images:      ['/vivo-favicon.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${nunito.variable}`}
    >
      <head>
        {/* Preload desktop hero video — only fetched on wider screens */}
        <link
          rel="preload"
          as="video"
          href="/video-desktop.mp4"
          type="video/mp4"
          media="(min-width: 769px)"
        />
        {/* Preload mobile hero video */}
        <link
          rel="preload"
          as="video"
          href="/video-mobile.mp4"
          type="video/mp4"
          media="(max-width: 768px)"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
            <CookieBanner />
          </CartProvider>
        </AuthProvider>
      </body>
      <GoogleAnalytics gaId="G-8331QRTG4Q" />
    </html>
  );
}
