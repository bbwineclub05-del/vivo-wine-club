import { getLocale, getTranslations } from 'next-intl/server';

import { benefitsFor, sintesiFor } from '@/lib/member-benefits';
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
 * Erano nove voci in una griglia, e sono diventate cinque in un
 * elenco numerato. Nove non erano piu' generose di cinque: tre o
 * quattro dicevano la stessa cosa con parole diverse, e un elenco
 * che si ripete si legge come una promessa gonfiata. Una griglia poi
 * serve a confrontare, e qui non c'e' niente da confrontare: c'e' da
 * leggere. Su un telefono le sue celle si incolonnavano in nove
 * scatole identiche, due schermi pieni che si scorrono senza averne
 * letta una.
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

  const voci = benefitsFor(locale);

  return (
    <div className="flex flex-col gap-12">
      <div>
        {titolo && <h2 className="ds-display text-title">{t('whatTitle')}</h2>}

        {sintesi ? (
          /* In home: tre righe e via. */
          <dl className={`${titolo ? 'mt-9' : ''} border-t ${bordo}`}>
            {sintesiFor(locale).map((v) => (
              <div key={v.title} className={`border-b ${bordo} py-5`}>
                <dt className="text-subtitle font-medium">{v.title}</dt>
                <dd className={`mt-1.5 text-body ${smorzato}`}>{v.body}</dd>
              </div>
            ))}
          </dl>
        ) : (
          /* Qui invece si legge per decidere, e allora servono le
             parole intere.
             Prima era una griglia: tre etichette a sinistra e nove
             celle a destra, tre per riga. Su un telefono quelle celle
             si incolonnano e diventano nove scatole uguali una sotto
             l'altra — si scorre fino in fondo senza averne letta una.
             Una griglia fa confrontare, e qui non c'e' niente da
             confrontare: c'e' da leggere.
             Adesso e' un elenco numerato. Il numero grande da' il
             passo e dice quante sono, cosi' si sa quando finisce; il
             titolo si legge da solo anche scorrendo in fretta; la
             riga sotto spiega a chi si e' fermato. Uno per riga,
             uguale sul telefono e sul computer: non c'e' un ordine
             di lettura da indovinare. */
          <ol className={`${titolo ? 'mt-10' : ''} border-t ${bordo}`}>
            {voci.map((v, i) => (
              <li
                key={v.id}
                className={`grid grid-cols-[2.2rem_1fr] gap-x-4 border-b ${bordo} py-6 sm:grid-cols-[4rem_1fr] sm:gap-x-8 sm:py-8`}
              >
                <span
                  aria-hidden="true"
                  className="ds-display ds-numeric text-[22px] leading-none text-accent/35 sm:text-[34px]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="ds-display text-[20px] leading-tight tracking-[-0.02em] sm:text-[26px]">
                    {v.title}
                  </h3>
                  <p className={`mt-2 max-w-[52ch] text-body ${smorzato}`}>{v.body}</p>
                </div>
              </li>
            ))}
          </ol>
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
