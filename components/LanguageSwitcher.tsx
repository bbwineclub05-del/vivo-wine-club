'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const LOCALES = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'it', flag: '🇮🇹', label: 'IT' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
] as const;

export default function LanguageSwitcher({ up = false }: { up?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function switchLocale(code: string) {
    if (code === locale) { setOpen(false); return; }
    document.cookie = `locale=${code}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    startTransition(() => { router.refresh(); });
  }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative" aria-label="Language selector">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1 text-[9px] tracking-[0.2em] px-1.5 py-1 rounded transition-colors duration-200 leading-none
          text-[#731515] hover:text-[#731515]/70
          ${pending ? 'cursor-wait opacity-60' : 'cursor-pointer'}
        `}
      >
        <span className="text-[13px] leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown
          size={10}
          strokeWidth={2.5}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — opens up or down depending on context */}
      {open && (
        <div
          role="listbox"
          className={`absolute right-0 bg-white border border-[#e8d5d5] shadow-md rounded py-1 z-[300] min-w-[72px]
            ${up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
          `}
        >
          {LOCALES.map(({ code, flag, label }) => {
            const active = code === locale;
            return (
              <button
                key={code}
                role="option"
                aria-selected={active}
                onClick={() => switchLocale(code)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-[0.2em] transition-colors duration-150
                  ${active
                    ? 'text-[#731515] font-semibold bg-[#f9f0f0]'
                    : 'text-[#6b3333] hover:bg-[#f9f0f0] hover:text-[#731515]'
                  }
                `}
              >
                <span className="text-[13px] leading-none">{flag}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
