'use client';

import { useEffect, type ReactNode } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';

/**
 * The shared pieces every section of the reserved area is built from.
 *
 * They exist because the same three problems were solved thirty times,
 * each slightly differently: tables that scrolled sideways on a phone,
 * a hand-rolled modal per section, and 9px labels. Fixing them here
 * fixes them everywhere.
 */

/* ── Page head ──────────────────────────────────────────────────── */

export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="ds-display text-[26px] leading-none tracking-[-0.03em] lg:text-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2.5 max-w-[62ch] text-body text-on-paper-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/* ── Buttons ────────────────────────────────────────────────────── */

const BTN =
  'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 ' +
  'text-fine font-medium whitespace-nowrap transition-colors duration-200 ' +
  'active:translate-y-px disabled:opacity-45 disabled:pointer-events-none';

export function ActionButton({
  children, onClick, variant = 'accent', type = 'button', disabled, className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'accent' | 'quiet' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const skin =
    variant === 'accent'
      ? 'bg-accent text-paper hover:bg-accent-lift'
      : variant === 'danger'
        ? 'border border-accent/40 text-accent hover:bg-accent/5'
        : 'border border-rule-paper text-on-paper hover:border-accent/40';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${BTN} ${skin} ${className}`}>
      {children}
    </button>
  );
}

export function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ActionButton onClick={onClick}>
      <Plus size={17} strokeWidth={2} />
      {label}
    </ActionButton>
  );
}

/* ── Toolbar ────────────────────────────────────────────────────── */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center gap-2.5">{children}</div>;
}

export function SearchField({
  value, onChange, placeholder = 'Cerca',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex min-w-[220px] flex-1 items-center gap-2.5 rounded-full border border-rule-paper bg-paper px-4">
      <Search size={17} strokeWidth={1.8} className="shrink-0 text-on-paper-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[48px] w-full bg-transparent text-body placeholder:text-on-paper-muted/60 focus:outline-none [font-size:16px]"
      />
      {value && (
        <button onClick={() => onChange('')} aria-label="Pulisci" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-paper-soft">
          <X size={15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export function FilterPills<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`inline-flex min-h-[48px] items-center gap-2 rounded-full border px-5 text-fine font-medium transition-colors ${
              active ? 'border-accent bg-accent text-paper' : 'border-rule-paper hover:border-accent/40'
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`ds-numeric text-[12px] ${active ? 'text-paper/70' : 'text-on-paper-muted'}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Data list ──────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  label: string;
  /** The one that becomes the card title on a phone. Exactly one. */
  primary?: boolean;
  /** Hidden on a phone: detail that does not earn its line there. */
  desktopOnly?: boolean;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

/**
 * A table on a desktop, a stack of cards on a phone.
 *
 * The old sections wrapped a `<table>` in `overflow-x-auto`, which on a
 * 390px screen means dragging a table sideways to read a row. Here the
 * same columns are re-laid out as label/value pairs under a title, so
 * nothing is ever off screen.
 */
export function DataList<T>({
  items, columns, getKey, onRowClick, empty,
}: {
  items: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}) {
  if (items.length === 0) return <>{empty}</>;

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const secondary = columns.filter((c) => c !== primary);

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-rule-paper lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-paper bg-paper-soft">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-5 py-3.5 text-fine font-medium text-on-paper-muted ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={getKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-rule-paper last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-paper-soft' : ''
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-5 py-4 text-body ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone */}
      <ul className="space-y-2.5 lg:hidden">
        {items.map((row) => (
          <li key={getKey(row)}>
            <div
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={`rounded-2xl border border-rule-paper p-4 ${
                onRowClick ? 'cursor-pointer active:bg-paper-soft' : ''
              }`}
            >
              <div className="text-body font-medium">{primary.render(row)}</div>
              <dl className="mt-3 space-y-1.5">
                {secondary
                  .filter((c) => !c.desktopOnly)
                  .map((c) => (
                    <div key={c.key} className="flex items-baseline justify-between gap-4">
                      <dt className="shrink-0 text-fine text-on-paper-muted">{c.label}</dt>
                      <dd className="min-w-0 text-right text-fine">{c.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── Empty state ────────────────────────────────────────────────── */

export function EmptyState({
  title, body, action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rule-paper px-6 py-14 text-center">
      <p className="ds-display text-[19px] tracking-[-0.02em]">{title}</p>
      {body && <p className="mx-auto mt-2.5 max-w-[46ch] text-body text-on-paper-muted">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── Sheet ──────────────────────────────────────────────────────── */

/**
 * One dialog for the whole area: a sheet from the bottom on a phone, a
 * centred panel on a desktop. Replaces thirteen hand-rolled overlays,
 * each with its own backdrop, scroll lock and close behaviour.
 */
export function Sheet({
  open, title, onClose, children, footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Il tasto indietro chiude il foglio in cima: la pila sta in un
  // posto solo, invece che dentro ogni foglio.
  useOverlayBackClose(open, onClose);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ds fixed inset-0 z-[80] flex flex-col lg:items-center lg:justify-center lg:p-10">
      <button aria-label="Chiudi" onClick={onClose} className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 mt-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper text-on-paper lg:mt-0 lg:max-w-[620px] lg:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-rule-paper px-5 py-4">
          <h2 className="ds-display text-[19px] tracking-[-0.02em]">{title}</h2>
          <button onClick={onClose} aria-label="Chiudi" className="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-soft">
            <X size={19} strokeWidth={1.8} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

        {footer && (
          <div
            className="border-t border-rule-paper px-5 py-4"
            style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Form fields ────────────────────────────────────────────────── */

const FIELD =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
  'placeholder:text-on-paper-muted/60 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

export function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-fine font-medium text-on-paper">
        {label}
        {hint && <span className="ml-2 font-normal text-on-paper-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export const fieldClass = FIELD;

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD} resize-none ${props.className ?? ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${FIELD} cursor-pointer appearance-none pr-11 ${props.className ?? ''}`} />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-paper-muted">
        <svg width="11" height="7" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

/* ── Status pill ────────────────────────────────────────────────── */

export function StatusPill({
  tone = 'neutral', children,
}: {
  tone?: 'neutral' | 'good' | 'warn' | 'off';
  children: ReactNode;
}) {
  const skin = {
    neutral: 'border-rule-paper text-on-paper-muted',
    good: 'border-accent/35 bg-accent/8 text-accent',
    warn: 'border-amber-500/40 bg-amber-50 text-amber-700',
    off: 'border-rule-paper bg-paper-soft text-on-paper-muted/70',
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-fine font-medium ${skin}`}>
      {children}
    </span>
  );
}
