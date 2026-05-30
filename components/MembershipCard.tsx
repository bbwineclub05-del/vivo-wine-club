import React from 'react';

export interface MembershipCardData {
  name: string;
  tier: string;        // 'Founder' | 'Staff' | 'Member'
  memberSince: number; // year
  memberId: string;    // 'VIVO-XXXX'
}

interface Props extends MembershipCardData {
  /** Ref forwarded to the outermost card div — used by the download handler. */
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Vivo Wine Club membership card — credit-card ratio (856 × 540 design units).
 *
 * Renders at full width of its container; aspect ratio is preserved via
 * padding-top trick. All styles are inline so html-to-image captures them
 * without needing to inline computed Tailwind classes.
 */
export default function MembershipCard({ name, tier, memberSince, memberId, cardRef }: Props) {
  // Syne + Nunito are loaded as CSS custom properties by layout.tsx.
  // We reference them here so the card inherits the correct typefaces.
  const SYNE   = "var(--font-syne), 'Syne', Georgia, serif";
  const NUNITO = "var(--font-nunito), 'Nunito', Arial, sans-serif";

  return (
    <div
      ref={cardRef}
      style={{
        position:    'relative',
        width:       '100%',
        aspectRatio: '856 / 540',
        borderRadius: '14px',
        overflow:    'hidden',
        background:  'linear-gradient(140deg, #8B0000 0%, #6B1010 50%, #5C0A0A 100%)',
        boxShadow:   '0 24px 60px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)',
        userSelect:  'none',
      }}
    >

      {/* — Radial warm highlight (top-right) — */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 88% 8%, rgba(200,60,60,0.30) 0%, transparent 55%)',
      }} />

      {/* — Soft vignette (edges) — */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)',
      }} />

      {/* — Subtle dot-grid texture — */}
      <div style={{
        position:        'absolute', inset: 0, pointerEvents: 'none',
        opacity:         0.04,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
        backgroundSize:  '22px 22px',
      }} />

      {/* — Fine diagonal lines (very subtle depth) — */}
      <div style={{
        position:        'absolute', inset: 0, pointerEvents: 'none',
        opacity:         0.025,
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 14px)',
      }} />

      {/* — Content — */}
      <div style={{
        position:       'absolute',
        inset:          0,
        padding:        '7.5% 8.5%',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
      }}>

        {/* TOP ROW: membership label + club name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{
            fontFamily:    NUNITO,
            fontSize:      'clamp(7px, 0.85vw, 9px)',
            letterSpacing: '0.55em',
            color:         'rgba(245,240,235,0.72)',
            fontWeight:    400,
          }}>
            MEMBERSHIP
          </span>
          <span style={{
            fontFamily:    SYNE,
            fontSize:      'clamp(11px, 1.35vw, 15px)',
            letterSpacing: '0.28em',
            color:         '#F5F0EB',
            fontWeight:    400,
          }}>
            VIVO WINE CLUB
          </span>
        </div>

        {/* CENTRE: member name + tier */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '4%' }}>
          <div style={{
            fontFamily:    SYNE,
            fontSize:      'clamp(20px, 3.8vw, 38px)',
            letterSpacing: '-0.015em',
            color:         '#F5F0EB',
            fontWeight:    300,
            lineHeight:    1.08,
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
          }}>
            {name}
          </div>
          <div style={{
            marginTop:     '2.5%',
            fontFamily:    NUNITO,
            fontSize:      'clamp(7px, 0.85vw, 9px)',
            letterSpacing: '0.55em',
            color:         'rgba(245,240,235,0.82)',
            fontWeight:    400,
          }}>
            {tier.toUpperCase()}
          </div>
        </div>

        {/* BOTTOM ROW: member since | member ID */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{
              fontFamily:    NUNITO,
              fontSize:      'clamp(6px, 0.7vw, 8px)',
              letterSpacing: '0.45em',
              color:         'rgba(245,240,235,0.70)',
              marginBottom:  '5px',
              fontWeight:    400,
            }}>
              MEMBER SINCE
            </div>
            <div style={{
              fontFamily: SYNE,
              fontSize:   'clamp(15px, 1.85vw, 20px)',
              color:      '#F5F0EB',
              fontWeight: 300,
            }}>
              {memberSince}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily:    NUNITO,
              fontSize:      'clamp(6px, 0.7vw, 8px)',
              letterSpacing: '0.45em',
              color:         'rgba(245,240,235,0.70)',
              marginBottom:  '5px',
              fontWeight:    400,
            }}>
              MEMBER ID
            </div>
            <div style={{
              fontFamily:    SYNE,
              fontSize:      'clamp(15px, 1.85vw, 20px)',
              color:         '#F5F0EB',
              fontWeight:    300,
              letterSpacing: '0.08em',
            }}>
              {memberId}
            </div>
          </div>
        </div>

      </div>

      {/* — Bottom accent bar (burgundy-to-crimson gradient) — */}
      <div style={{
        position:   'absolute',
        bottom:     0, left: 0, right: 0,
        height:     '3.5px',
        background: 'linear-gradient(90deg, #5a1010 0%, #c84040 35%, #c84040 65%, #5a1010 100%)',
        opacity:    0.9,
      }} />

    </div>
  );
}
