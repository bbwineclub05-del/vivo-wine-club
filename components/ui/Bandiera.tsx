/**
 * Le bandiere, disegnate.
 *
 * Prima erano emoji: 🇮🇹 🇬🇧 🇫🇷. Sembrano una buona idea finche' non
 * si guardano da vicino. Ogni sistema le disegna a modo suo, su
 * Windows molte non esistono proprio e restano due lettere in un
 * quadratino, e comunque hanno il bordo squadrato e i colori di
 * qualcun altro in mezzo a una barra che ne ha di suoi.
 *
 * Qui sono tre SVG di venti righe: tonde come i cerchi del resto
 * dell'interfaccia, nitide a qualunque dimensione, uguali ovunque.
 * Il cerchio lo fa il contenitore con `overflow-hidden`, cosi' non
 * serve una `clipPath` con un id, che ripetuta quattro volte nella
 * stessa pagina sarebbe un id duplicato.
 */

const DIM = 'inline-block shrink-0 overflow-hidden rounded-full';

function Guscio({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <span className={DIM} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 60 60" width={size} height={size} className="block">
        {children}
      </svg>
    </span>
  );
}

function Italia({ size }: { size: number }) {
  return (
    <Guscio size={size}>
      <rect width="20" height="60" fill="#008C45" />
      <rect x="20" width="20" height="60" fill="#F4F5F0" />
      <rect x="40" width="20" height="60" fill="#CD212A" />
    </Guscio>
  );
}

function Francia({ size }: { size: number }) {
  return (
    <Guscio size={size}>
      <rect width="20" height="60" fill="#000091" />
      <rect x="20" width="20" height="60" fill="#F4F5F0" />
      <rect x="40" width="20" height="60" fill="#E1000F" />
    </Guscio>
  );
}

function RegnoUnito({ size }: { size: number }) {
  return (
    <Guscio size={size}>
      <rect width="60" height="60" fill="#012169" />
      <path d="M0 0 60 60M60 0 0 60" stroke="#F4F5F0" strokeWidth="12" />
      <path d="M0 0 60 60M60 0 0 60" stroke="#C8102E" strokeWidth="6" />
      <path d="M30 0V60M0 30H60" stroke="#F4F5F0" strokeWidth="18" />
      <path d="M30 0V60M0 30H60" stroke="#C8102E" strokeWidth="10" />
    </Guscio>
  );
}

const BANDIERE = { it: Italia, en: RegnoUnito, fr: Francia } as const;

export type CodiceBandiera = keyof typeof BANDIERE;

export function Bandiera({ code, size = 18 }: { code: CodiceBandiera; size?: number }) {
  const B = BANDIERE[code];
  return <B size={size} />;
}
