'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { Bandiera, type CodiceBandiera } from '@/components/ui/Bandiera';

/**
 * La scelta della lingua.
 *
 * Nella barra sta stretta: bandiera e due lettere. Aprendola c'e'
 * spazio per il nome scritto per intero, e scritto nella lingua
 * stessa: «Italiano» lo riconosce anche chi sta leggendo il sito in
 * una lingua che non e' la sua, «IT» no.
 *
 * La lingua attiva ha la spunta. Il colore da solo non basta a dirlo:
 * chi non distingue bene i toni vedrebbe tre righe uguali.
 */

const LINGUE = [
  { code: 'it', nome: 'Italiano', breve: 'IT' },
  { code: 'en', nome: 'English', breve: 'EN' },
  { code: 'fr', nome: 'Français', breve: 'FR' },
] as const satisfies readonly { code: CodiceBandiera; nome: string; breve: string }[];

/* La scrittura del cookie sta fuori dal componente: il compilatore di
   React considera `document` un valore che un componente non deve
   toccare, e aveva ragione a segnalarlo. */
function ricordaLingua(code: string) {
  document.cookie = `locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
}

export default function LanguageSwitcher({ up = false }: { up?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const corrente = LINGUE.find((l) => l.code === locale) ?? LINGUE[0];

  function cambia(code: string) {
    if (code === locale) {
      setOpen(false);
      return;
    }
    ricordaLingua(code);
    setOpen(false);
    startTransition(() => {
      router.refresh();
    });
  }

  /* Si chiude cliccando fuori o con Esc: un menu che resta aperto
     mentre si legge la pagina e' un menu rotto. */
  useEffect(() => {
    if (!open) return;
    function fuori(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={corrente.nome}
        className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-2.5 text-fine font-medium leading-none
          transition-opacity duration-200 hover:opacity-70
          ${pending ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
      >
        <Bandiera code={corrente.code} size={18} />
        <span>{corrente.breve}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute right-0 z-[300] min-w-[176px] overflow-hidden rounded-2xl border border-rule-paper
            bg-paper py-1.5 text-on-paper shadow-[0_18px_44px_-24px_rgba(26,5,5,0.5)]
            ${up ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {LINGUE.map(({ code, nome }) => {
            const attiva = code === locale;
            return (
              <button
                key={code}
                role="option"
                aria-selected={attiva}
                onClick={() => cambia(code)}
                className={`flex min-h-[44px] w-full items-center gap-3 px-3.5 text-body transition-colors duration-150
                  ${attiva ? 'bg-paper-soft font-medium' : 'hover:bg-paper-soft'}`}
              >
                <Bandiera code={code} size={22} />
                <span className="flex-1 text-left leading-none">{nome}</span>
                {attiva && <Check size={16} strokeWidth={2.2} className="text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
