import type { Metadata, Viewport } from "next";
import { Syne, Nunito, Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/lib/auth";
import CartDrawer from "@/components/CartDrawer";
import EntryGate from "@/components/ui/EntryGate";
import ConsentGatedScripts from "@/components/ConsentGatedScripts";
import WineAssistantWidget from "@/components/WineAssistantWidget";
import { NextIntlClientProvider } from 'next-intl';
import { localeDellaRichiesta } from '@/i18n/request';
import messagesEn from '../messages/en.json';
import messagesIt from '../messages/it.json';
import messagesFr from '../messages/fr.json';

const MESSAGES_MAP = { en: messagesEn, it: messagesIt, fr: messagesFr } as const;

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

// Text and UI face for the 2026 redesign. Replaces Nunito page by page;
// Nunito stays loaded until the last legacy surface is converted.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La stessa scelta che fa next-intl, non una copia: cookie se c'e',
  // altrimenti la lingua del browser.
  const locale = await localeDellaRichiesta();
  const messages = MESSAGES_MAP[locale];

  return (
    <html
      lang={locale}
      translate="no"
      className={`${syne.variable} ${nunito.variable} ${geist.variable} notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />
        {/* Preload hero background video */}
        <link
          rel="preload"
          as="video"
          href="/videosito-corto.mp4"
          type="video/mp4"
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} formats={{}} timeZone="UTC" now={new Date()}>
          <AuthProvider>
            <CartProvider>
              {children}
              <CartDrawer />
              <EntryGate />
              <WineAssistantWidget />
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
      <ConsentGatedScripts />
    </html>
  );
}
