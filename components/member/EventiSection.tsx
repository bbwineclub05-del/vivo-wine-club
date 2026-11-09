'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { CalendarDays, Download, MapPin } from 'lucide-react';
import { Head, Panel } from '@/components/member/MemberShell';
import { getEventDisplayStatus, type DisplayStatus } from '@/lib/events';

/**
 * I tuoi biglietti e cosa viene dopo, nella stessa schermata.
 *
 * Erano due voci di menù separate — "My Events" e "Upcoming Events" —
 * e la domanda che uno si fa è una sola: cosa ho in mano e dove vado.
 */

interface Biglietto {
  order_id: string;
  event_id: string;
  name: string;
  checked_in: boolean;
  event?: { title: string; date: string; location: string; slug: string } | null;
}

interface Evento {
  slug: string;
  status: 'open' | 'soldout' | 'soon' | 'completed';
  registrationClosed?: boolean;
  isListOnly?: boolean;
  title: string;
  date: string;
  time: string | null;
  location: string;
  price: number | null;
}

function fmtDate(iso: string, locale: string) {
  if (!iso) return '';
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
}

export default function EventiSection({ token }: { token: string }) {
  const t = useTranslations('member');
  const tc = useTranslations('common');
  const oggi = new Date().toISOString().slice(0, 10);
  const locale = useLocale();
  const [biglietti, setBiglietti] = useState<Biglietto[]>([]);
  const [eventi, setEventi] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [scarico, setScarico] = useState<string | null>(null);
  const data = (iso: string) => fmtDate(iso, locale);

  const carica = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([
        token ? fetch('/api/member/tickets', { headers: { Authorization: `Bearer ${token}` } }) : null,
        fetch('/api/events'),
      ]);
      if (t?.ok) setBiglietti((await t.json()).tickets ?? []);
      if (e.ok) setEventi((await e.json()).events ?? []);
    } catch {
      /* gli stati vuoti dicono già cosa succede */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { carica(); }, [carica]);

  async function scaricaPdf(orderId: string, slug: string) {
    setScarico(orderId);
    try {
      const res = await fetch(`/api/member/tickets/${encodeURIComponent(orderId)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vivo-${slug}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* il pulsante torna com'era: si riprova */
    } finally {
      setScarico(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Head title={t('eventiTitolo')} subtitle={t('eventiSottotitolo')} />

      <h3 className="ds-display mb-3 text-[19px] leading-none tracking-[-0.02em]">{t('inProgramma')}</h3>
      {eventi.length === 0 ? (
        <Panel>
          <p className="text-body">{t('nessunaData')}</p>
          <p className="mt-2 text-fine text-on-paper-muted">{t('nessunaDataAiuto')}</p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {eventi.map((e) => {
            /* Qui dentro si compra solo quello che si puo' comprare
               anche dal sito pubblico. Prima ogni data portava al
               pagamento, comprese quelle ancora da aprire: il socio
               compilava tutto e si prendeva un errore alla fine.
               Quando non e' aperta, la riga porta alla pagina
               dell'evento e dice a che punto siamo. */
            const stato: DisplayStatus = getEventDisplayStatus(
              { status: e.status, date: e.date, registrationClosed: e.registrationClosed },
              oggi,
            );
            const siCompra = stato === 'open';

            return (
              <Link
                key={e.slug}
                href={siCompra ? `/checkout/${e.slug}` : `/events/${e.slug}`}
                className="flex items-center gap-3.5 rounded-2xl border border-rule-paper px-4 py-3.5 transition-colors hover:border-accent/40"
              >
                <CalendarDays size={19} strokeWidth={1.7} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium">{e.title}</span>
                  <span className="mt-0.5 block truncate text-fine capitalize text-on-paper-muted">
                    {data(e.date)}{e.time ? ` · ${e.time}` : ''} · {e.location}
                  </span>
                </span>
                <span className="shrink-0 text-fine text-on-paper-muted">
                  {siCompra
                    ? <span className="ds-numeric">{e.price ? `${e.price} €` : t('gratis')}</span>
                    : tc(stato === 'soldout' ? 'soldOut' : stato === 'closed' ? 'registrationsClosed' : 'comingSoon')}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <h3 className="ds-display mb-3 mt-8 text-[19px] leading-none tracking-[-0.02em]">
        {t('tuoiBiglietti')}
        {biglietti.length > 0 && (
          <span className="ds-numeric ml-2 text-[14px] font-normal text-on-paper-muted">{biglietti.length}</span>
        )}
      </h3>

      {biglietti.length === 0 ? (
        <Panel>
          <p className="text-body">{t('nessunBiglietto')}</p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-2">
          {biglietti.map((b) => (
            <div key={b.order_id} className="rounded-2xl border border-rule-paper px-4 py-3.5">
              <div className="flex items-start gap-3">
                <MapPin size={18} strokeWidth={1.7} className="mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium">{b.event?.title ?? b.event_id}</p>
                  <p className="mt-0.5 truncate text-fine capitalize text-on-paper-muted">
                    {b.event?.date ? data(b.event.date) : ''}
                    {b.event?.location ? ` · ${b.event.location}` : ''}
                    {b.checked_in ? ` · ${t('giaEntrato')}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => scaricaPdf(b.order_id, b.event?.slug ?? b.event_id)}
                disabled={scarico === b.order_id}
                className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rule-paper px-4 text-fine font-medium transition-colors hover:border-accent/40 disabled:opacity-50"
              >
                <Download size={15} strokeWidth={1.9} />
                {scarico === b.order_id ? t('scaricoInCorso') : t('scaricaBiglietto')}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
