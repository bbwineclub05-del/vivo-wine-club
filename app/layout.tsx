import type { Metadata, Viewport } from "next";
import { Syne, Nunito } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/lib/auth";
import CartDrawer from "@/components/CartDrawer";
import CookieBanner from "@/components/CookieBanner";
import WineAssistantWidget from "@/components/WineAssistantWidget";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { PIXEL_ID } from "@/lib/pixel";
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
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
  const LOCALES = ['en', 'it', 'fr'] as const;
  const cookieStore = await cookies();
  const raw = cookieStore.get('locale')?.value ?? '';
  const locale = (LOCALES as readonly string[]).includes(raw) ? (raw as keyof typeof MESSAGES_MAP) : 'en';
  const messages = MESSAGES_MAP[locale];

  return (
    <html
      lang={locale}
      translate="no"
      className={`${syne.variable} ${nunito.variable} notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />
        {/* Preload hero background video */}
        <link
          rel="preload"
          as="video"
          href="/reel-vivo-petra.mp4"
          type="video/mp4"
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} formats={{}} timeZone="UTC" now={new Date()}>
          <AuthProvider>
            <CartProvider>
              {children}
              <CartDrawer />
              <CookieBanner />
              <WineAssistantWidget />
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
      <GoogleAnalytics gaId="G-8331QRTG4Q" />
      {/* Meta Pixel */}
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}</Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </html>
  );
}
