'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import { PIXEL_ID } from '@/lib/pixel';
import { CONSENT_CHANGED_EVENT, getStoredConsent, type ConsentCategories } from '@/lib/cookieConsent';

/** Loads Google Analytics and Meta Pixel only once the user has actually consented to each. */
export default function ConsentGatedScripts() {
  const [consent, setConsent] = useState<ConsentCategories | null>(null);

  useEffect(() => {
    setConsent(getStoredConsent());
    const handler = (e: Event) => setConsent((e as CustomEvent<ConsentCategories>).detail);
    window.addEventListener(CONSENT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handler);
  }, []);

  return (
    <>
      {consent?.analytics && <GoogleAnalytics gaId="G-8331QRTG4Q" />}

      {consent?.marketing && (
        // No <noscript> fallback pixel here on purpose: this component only
        // ever runs when JavaScript is enabled (and consent was read from
        // localStorage, which also requires JS), so a no-JS fallback would
        // never actually run for the audience it targets — and there'd be no
        // way to know a no-JS visitor's consent choice to gate it correctly.
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
      )}
    </>
  );
}
