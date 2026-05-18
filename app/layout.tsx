import type { Metadata, Viewport } from "next";
import { Syne, Nunito } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/lib/auth";
import CartDrawer from "@/components/CartDrawer";

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
  title: "Vivo Wine Club — The Art of Fine Wine, Shared",
  description:
    "The exclusive club for wine lovers. Tastings, winery tours and access to the world's rarest and finest wines.",
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
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
