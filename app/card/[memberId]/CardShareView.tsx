'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import MembershipCard, { type MembershipCardData } from '@/components/MembershipCard';

export default function CardShareView({ card }: { card: MembershipCardData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `vivo-card-${card.memberId}.png`;
      a.click();
    } catch (err) {
      console.error('[CardShareView] download error:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      style={{
        minHeight:       '100dvh',
        background:      '#080101',
        backgroundImage: 'url(/vigna.jpg)',
        backgroundSize:  'cover',
        backgroundPosition: 'center',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '32px 24px',
        position:        'relative',
      }}
    >
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,1,1,0.75)' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>

        {/* Club wordmark */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily:    'var(--font-syne), Georgia, serif',
            fontSize:      '13px',
            letterSpacing: '0.4em',
            color:         'rgba(255,255,255,0.35)',
            fontWeight:    400,
          }}>
            VIVO WINE CLUB
          </div>
        </div>

        {/* The card */}
        <div style={{ width: '100%' }}>
          <MembershipCard {...card} cardRef={cardRef} />
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           '8px',
            padding:       '12px 32px',
            background:    'rgba(255,255,255,0.06)',
            border:        '1px solid rgba(255,255,255,0.12)',
            borderRadius:  '10px',
            color:         'rgba(255,255,255,0.6)',
            fontFamily:    'var(--font-nunito), Arial, sans-serif',
            fontSize:      '10px',
            letterSpacing: '0.35em',
            cursor:        downloading ? 'wait' : 'pointer',
            transition:    'all 0.2s',
            opacity:       downloading ? 0.5 : 1,
          }}
        >
          {downloading ? 'DOWNLOADING...' : 'DOWNLOAD PNG'}
        </button>

        {/* Footer link */}
        <Link
          href="/"
          style={{
            fontFamily:    'var(--font-nunito), Arial, sans-serif',
            fontSize:      '10px',
            letterSpacing: '0.3em',
            color:         'rgba(255,255,255,0.18)',
            textDecoration: 'none',
          }}
        >
          VIVOWINECLUB.COM
        </Link>

      </div>
    </div>
  );
}
