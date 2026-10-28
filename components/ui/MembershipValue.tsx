import { getLocale, getTranslations } from 'next-intl/server';
import {
  Gift, Grape, Home, Lock, MapPin, Percent, Plane, Shirt, Star, Ticket,
} from 'lucide-react';

import { benefitsFor } from '@/lib/member-benefits';
import {
  FOUNDING_OFFER_CENTS, FREE_UNTIL, STANDARD_PRICE_CENTS,
} from '@/lib/membership';

/**
 * Perche' vale la pena avere la tessera.
 *
 * La pagina di iscrizione era un titolo e un modulo: chiedeva i dati
 * senza aver mai detto cosa si compra. Qui c'e' la risposta, e sta
 * sopra al modulo perche' nessuno compila un modulo per scoprire poi
 * cosa ha preso.
 *
 * Le voci non sono scritte qui: arrivano da `lib/member-benefits.ts`,
 * lo stesso posto da cui le prendono l'area del socio e le mail di
 * benvenuto. Una promessa sola, in un posto solo.
 *
 * Anche i prezzi arrivano dalle regole vere (`lib/membership.ts`):
 * se cambia la data dello sconto, cambia la frase, e non possono
 * dire due cose diverse.
 */

const ICONE = {
  grapes: Grape, ticket: Ticket, lock: Lock, map: MapPin, shirt: Shirt,
  percent: Percent, star: Star, home: Home, plane: Plane, gift: Gift,
};

/** «30 €», «20 €»: come li scrive una persona. */
function euro(centesimi: number): string {
  return `${centesimi / 100} €`;
}

/** «31 dicembre 2026», nella lingua di chi legge. */
function giorno(iso: string, locale: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function MembershipValue({
  ground = 'paper',
  titolo = true,
}: {
  ground?: 'paper' | 'ink';
  /** Spento dove il titolo lo mette gia' la pagina attorno. */
  titolo?: boolean;
}) {
  const t = await getTranslations('membership');
  const locale = await getLocale();

  const scuro = ground === 'ink';
  const smorzato = scuro ? 'text-on-ink-muted' : 'text-on-paper-muted';
  const bordo = scuro ? 'border-rule-ink' : 'border-rule-paper';

  // Il pacco di benvenuto ha un riquadro suo: e' l'unica cosa che
  // arriva a casa, e si tocca.
  const voci = benefitsFor(locale).filter((b) => b.id !== 'pack');

  return (
    <div className="flex flex-col gap-12">
      <div>
        {titolo && <h2 className="ds-display text-title">{t('whatTitle')}</h2>}

        <ul className={`${titolo ? 'mt-8' : ''} grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 ${bordo} ${
          scuro ? 'bg-rule-ink' : 'bg-rule-paper'
        }`}>
          {voci.map((b) => {
            const Icon = ICONE[b.icon];
            return (
              <li key={b.id} className={`flex gap-4 ${scuro ? 'bg-ink' : 'bg-paper'} p-5`}>
                <span className="mt-0.5 shrink-0 text-accent">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-body font-medium">{b.title}</p>
                  <p className={`mt-1.5 text-fine ${smorzato}`}>{b.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`rounded-2xl border ${bordo} p-6`}>
        <p className="inline-flex items-center gap-2 text-fine font-medium text-accent">
          <Gift size={17} strokeWidth={1.8} />
          {t('packTitle')}
        </p>
        <p className={`mt-2 max-w-[52ch] text-body ${smorzato}`}>{t('packBody')}</p>
      </div>

      <div>
        <h2 className="ds-display text-title">{t('priceTitle')}</h2>
        <p className="ds-display mt-6 text-[clamp(2rem,5vw,3.2rem)] leading-none tracking-[-0.03em] text-accent">
          {t('priceFreeNow')}
        </p>
        <div className={`mt-5 flex max-w-[58ch] flex-col gap-3 text-body ${smorzato}`}>
          <p>{t('priceFreeUntil', { free: giorno(FREE_UNTIL, locale) })}</p>
          <p>
            {t('priceRenew', {
              offer: euro(FOUNDING_OFFER_CENTS),
              full: euro(STANDARD_PRICE_CENTS),
            })}
          </p>
          <p>{t('priceAfter', { full: euro(STANDARD_PRICE_CENTS) })}</p>
          <p>{t('priceWhy')}</p>
        </div>
      </div>
    </div>
  );
}
