import { getLocale, getTranslations } from 'next-intl/server';

import { benefitGroupsFor, sintesiFor } from '@/lib/member-benefits';
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
 * Erano nove riquadri uguali, tre per riga, ognuno con la sua
 * icona. Una griglia cosi' non si legge: si guarda due secondi e si
 * scorre via, e su un telefono erano due schermi pieni. Adesso sono
 * tre mucchi da tre, scritti come un indice: il nome a sinistra, la
 * riga che spiega accanto. Niente icone, niente caselle. Le icone
 * erano dieci simboli diversi che dicevano meno delle dieci parole
 * che avevano sotto.
 *
 * Anche i prezzi arrivano dalle regole vere (`lib/membership.ts`):
 * se cambia la data dello sconto, cambia la frase, e non possono
 * dire due cose diverse.
 */


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
  prezzo = true,
  sintesi = false,
}: {
  ground?: 'paper' | 'ink';
  /** Spento dove il titolo lo mette gia' la pagina attorno. */
  titolo?: boolean;
  /** Spento dove il prezzo lo dice la pagina dove si paga. */
  prezzo?: boolean;
  /**
   * Tre punti invece di nove, e del prezzo solo che oggi non si paga.
   *
   * E' la home: li' non si decide se iscriversi, si decide se andare
   * a vedere. Nove voci e tre cifre lette di sfuggita non convincono
   * nessuno, e rispondono a domande che non ci si e' ancora fatti. Il
   * racconto per intero sta una pagina piu' in la', dove serve.
   */
  sintesi?: boolean;
}) {
  const t = await getTranslations('membership');
  const locale = await getLocale();

  const scuro = ground === 'ink';
  const smorzato = scuro ? 'text-on-ink-muted' : 'text-on-paper-muted';
  const bordo = scuro ? 'border-rule-ink' : 'border-rule-paper';

  const gruppi = benefitGroupsFor(locale);

  return (
    <div className="flex flex-col gap-12">
      <div>
        {titolo && <h2 className="ds-display text-title">{t('whatTitle')}</h2>}

        {sintesi ? (
          <dl className={`${titolo ? 'mt-9' : ''} border-t ${bordo}`}>
            {sintesiFor(locale).map((v) => (
              <div key={v.title} className={`border-b ${bordo} py-5`}>
                <dt className="text-subtitle font-medium">{v.title}</dt>
                <dd className={`mt-1.5 text-body ${smorzato}`}>{v.body}</dd>
              </div>
            ))}
          </dl>
        ) : (
          /* Tre righe, non tre colonne. In colonna i tre mucchi finivano
             ad altezze diverse e i filetti non si incontravano mai: la
             prima colonna sembrava storta. In riga il filetto corre da
             un bordo all'altro, e di filetti ce ne sono tre invece di
             nove. L'etichetta sta a sinistra, come in un indice. */
          <div className={`${titolo ? 'mt-9' : ''} border-t ${bordo}`}>
          {gruppi.map((g) => (
            <section
              key={g.id}
              className={`grid gap-x-10 gap-y-3 border-b ${bordo} py-5 md:grid-cols-[clamp(140px,15vw,210px)_1fr]`}
            >
              <h3 className="text-fine font-medium uppercase tracking-[0.14em] text-accent md:pt-1">
                {g.titolo}
              </h3>

              <dl className="grid gap-x-10 gap-y-2.5 md:grid-cols-3">
                {g.voci.map((b) => (
                  <div key={b.id} className="text-fine">
                    <dt className="inline text-body font-medium">{b.title}.</dt>{' '}
                    <dd className={`inline ${smorzato}`}>{b.body}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        )}
      </div>

      {prezzo && (
      <div>
        <h2 className="ds-display text-title">{t('priceTitle')}</h2>
        <p className="ds-display mt-6 text-[clamp(2rem,5vw,3.2rem)] leading-none tracking-[-0.03em] text-accent">
          {t('priceFreeNow')}
        </p>
        <div className={`mt-5 flex max-w-[66ch] flex-col gap-3 text-body ${smorzato}`}>
          <p>{t('priceFreeUntil', { free: giorno(FREE_UNTIL, locale) })}</p>
          {/* Le cifre del rinnovo no: in home sono la risposta a una
              domanda che nessuno si e' ancora fatto, e un numero
              letto prima di sapere cosa si compra e' solo un motivo
              per non cliccare. Stanno dove ci si iscrive. */}
          {!sintesi && (
            <>
              <p>
                {t('priceRenew', {
                  offer: euro(FOUNDING_OFFER_CENTS),
                  full: euro(STANDARD_PRICE_CENTS),
                })}
              </p>
              <p>{t('priceAfter', { full: euro(STANDARD_PRICE_CENTS) })}</p>
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
