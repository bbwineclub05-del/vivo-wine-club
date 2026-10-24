'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, Copy, Loader2, Truck } from 'lucide-react';
import {
  ActionButton,
  EmptyState,
  Field,
  Select,
  Sheet,
  StatusPill,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import {
  CARRIERS,
  CARRIER_TRACKING,
  autoTrackingUrl,
  dataOra,
  euro,
  type MerchOrder,
} from '@/components/merch/types';

/**
 * Gli ordini arrivati, e cosa farci.
 *
 * Un ordine ha tre stati e un'unica cosa che conta davvero: l'indirizzo
 * dove spedire e il pulsante che manda la mail con il tracking. Erano
 * annegati in sette etichette da otto pixel con quattro colori diversi
 * — blu, verde, arancio, ambra — che non volevano dire niente.
 */

function CopyAddress({ text }: { text: string }) {
  const [fatto, setFatto] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setFatto(true);
          setTimeout(() => setFatto(false), 2000);
        });
      }}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-rule-paper px-3.5 text-fine text-on-paper-muted transition-colors hover:border-accent/40 hover:text-accent"
    >
      {fatto ? <Check size={14} strokeWidth={2.2} /> : <Copy size={14} strokeWidth={1.8} />}
      {fatto ? 'Copiato' : 'Copia indirizzo'}
    </button>
  );
}

function ShippingSheet({
  order,
  token,
  onClose,
  onSent,
}: {
  order: MerchOrder;
  token: string;
  onClose: () => void;
  onSent: (o: MerchOrder) => void;
}) {
  const oggi = new Date().toISOString().slice(0, 10);

  const [corriere, setCorriere] = useState(order.carrier ?? '');
  const [altroCorriere, setAltroCorriere] = useState('');
  const [codice, setCodice] = useState(order.tracking_code ?? '');
  const [link, setLink] = useState(order.tracking_url ?? '');
  const [data, setData] = useState(order.shipped_at?.slice(0, 10) ?? oggi);
  const [note, setNote] = useState(order.shipping_notes ?? '');
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState('');
  const [linkAMano, setLinkAMano] = useState(false);

  /* Il link si compila da solo dal corriere e dal codice, finché
     qualcuno non lo scrive a mano: da lì in poi comanda lui. */
  useEffect(() => {
    if (linkAMano) return;
    const c = corriere === 'Altro' ? altroCorriere : corriere;
    if (c && codice && CARRIER_TRACKING[c]) setLink(autoTrackingUrl(c, codice));
  }, [corriere, altroCorriere, codice, linkAMano]);

  const reinvio = order.status === 'spedito';

  async function invia() {
    setErrore('');
    setInviando(true);
    try {
      const c = corriere === 'Altro' ? altroCorriere : corriere;
      const res = await fetch(`/api/merch/orders/${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          carrier: c || null,
          tracking_code: codice.trim() || null,
          tracking_url: link.trim() || null,
          shipped_at: data || null,
          shipping_notes: note.trim() || null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Non sono riuscito a mandare la mail.');
      onSent(payload.order as MerchOrder);
      onClose();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore sconosciuto.');
    } finally {
      setInviando(false);
    }
  }

  return (
    <Sheet
      open
      title={reinvio ? 'Modifica e reinvia' : 'Spedizione'}
      onClose={onClose}
      footer={
        <ActionButton onClick={invia} disabled={inviando} className="w-full">
          {inviando ? <Loader2 size={15} className="animate-spin" /> : <Truck size={16} strokeWidth={1.8} />}
          {inviando ? 'Mando…' : reinvio ? 'Reinvia la mail' : 'Manda la mail di spedizione'}
        </ActionButton>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Corriere">
          <Select
            value={corriere}
            onChange={(e) => {
              setCorriere(e.target.value);
              setLinkAMano(false);
            }}
          >
            <option value="">Scegli il corriere</option>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        {corriere === 'Altro' && (
          <Field label="Quale corriere">
            <TextInput
              value={altroCorriere}
              onChange={(e) => setAltroCorriere(e.target.value)}
              placeholder="Nome del corriere"
            />
          </Field>
        )}

        <Field label="Codice di tracciamento">
          <TextInput
            value={codice}
            onChange={(e) => {
              setCodice(e.target.value);
              setLinkAMano(false);
            }}
            placeholder="es. 12345678901234"
          />
        </Field>

        <Field
          label="Link di tracciamento"
          hint={corriere && corriere !== 'Altro' && CARRIER_TRACKING[corriere] ? `scritto da solo per ${corriere}` : undefined}
        >
          <TextInput
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkAMano(true);
            }}
            placeholder="https://…"
          />
        </Field>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="-mt-3 inline-flex text-fine text-accent underline underline-offset-2"
          >
            Prova il link ↗
          </a>
        )}

        <Field label="Data di spedizione">
          <TextInput type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>

        <Field label="Note" hint="facoltative">
          <TextArea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="es. Pacco in due colli."
          />
        </Field>

        {errore && (
          <p className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-fine text-accent">{errore}</p>
        )}
      </div>
    </Sheet>
  );
}

function OrderCard({
  order,
  token,
  onUpdated,
}: {
  order: MerchOrder;
  token: string;
  onUpdated: (o: MerchOrder) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [spedizione, setSpedizione] = useState(false);

  const spedito = order.status === 'spedito';
  const evaso = order.status === 'evaso';

  async function cambiaStato() {
    setSalvando(true);
    const next = spedito ? 'evaso' : evaso ? 'da_evadere' : 'evaso';
    try {
      const res = await fetch(`/api/merch/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.order) onUpdated(data.order);
    } finally {
      setSalvando(false);
    }
  }

  const indirizzo = [
    order.shipping_line1,
    order.shipping_line2,
    [order.shipping_postal, order.shipping_city, order.shipping_state].filter(Boolean).join(' '),
    order.shipping_country,
  ].filter(Boolean);

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-rule-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-paper bg-paper-soft px-4 py-3">
          <button
            type="button"
            onClick={cambiaStato}
            disabled={salvando}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rule-paper bg-paper px-4 text-fine font-medium transition-colors hover:border-accent/40 disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 size={14} className="animate-spin" />
            ) : spedito ? (
              <Truck size={14} strokeWidth={1.8} className="text-accent" />
            ) : evaso ? (
              <Check size={14} strokeWidth={2.2} className="text-accent" />
            ) : (
              <Clock size={14} strokeWidth={1.8} className="text-amber-600" />
            )}
            {spedito ? 'Spedito' : evaso ? 'Evaso' : 'Da evadere'}
          </button>
          <span className="text-fine text-on-paper-muted">{dataOra(order.created_at)}</span>
        </div>

        <div className="flex flex-col gap-5 px-4 py-4">
          <div>
            <p className="text-body font-medium">{order.customer_name ?? '—'}</p>
            <p className="mt-0.5 flex flex-wrap gap-x-4 text-fine text-on-paper-muted">
              {order.customer_email && <span>{order.customer_email}</span>}
              {order.phone && <span>{order.phone}</span>}
            </p>
          </div>

          <div>
            <p className="text-fine font-medium text-on-paper">Dove spedire</p>
            {indirizzo.length > 0 ? (
              <>
                <address className="mt-1.5 not-italic text-body text-on-paper-muted">
                  {indirizzo.map((riga, i) => (
                    <span key={i} className="block">
                      {riga}
                    </span>
                  ))}
                </address>
                <div className="mt-2.5">
                  <CopyAddress text={indirizzo.join(', ')} />
                </div>
              </>
            ) : (
              <p className="mt-1.5 text-fine text-on-paper-muted">
                Non disponibile: ordine precedente alla raccolta dell’indirizzo.
              </p>
            )}
          </div>

          {order.delivery_notes && (
            <div>
              <p className="text-fine font-medium text-on-paper">Note del cliente</p>
              <p className="mt-1.5 rounded-2xl border border-amber-500/40 bg-amber-50 px-3.5 py-2.5 text-fine text-amber-900">
                {order.delivery_notes}
              </p>
            </div>
          )}

          {spedito && (order.carrier || order.tracking_code) && (
            <div>
              <p className="text-fine font-medium text-on-paper">Tracking</p>
              <div className="mt-1.5 rounded-2xl border border-rule-paper px-3.5 py-3 text-fine text-on-paper-muted">
                {order.carrier && <p className="text-on-paper">{order.carrier}</p>}
                {order.tracking_code && <p className="ds-numeric mt-0.5">{order.tracking_code}</p>}
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-accent underline underline-offset-2"
                  >
                    Traccia il pacco ↗
                  </a>
                )}
                {order.shipped_at && (
                  <p className="mt-1">
                    Spedito il{' '}
                    {new Date(order.shipped_at).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                {order.shipping_notes && <p className="mt-1">{order.shipping_notes}</p>}
              </div>
            </div>
          )}

          <div>
            <p className="text-fine font-medium text-on-paper">Cosa ha comprato</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-body">
                  <span className="min-w-0">
                    <span className="ds-numeric">{item.qty}×</span> {item.name}
                  </span>
                  <span className="ds-numeric shrink-0 text-on-paper-muted">{euro(item.price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 border-t border-rule-paper pt-2.5 text-right text-body font-medium">
              Totale <span className="ds-numeric text-accent">{euro(order.total)}</span>
            </p>
          </div>

          {order.customer_email && (
            <ActionButton
              variant={spedito ? 'quiet' : 'accent'}
              onClick={() => setSpedizione(true)}
              disabled={!evaso && !spedito}
              className="w-full"
            >
              <Truck size={16} strokeWidth={1.8} />
              {spedito ? 'Reinvia la mail' : 'Manda la mail di spedizione'}
            </ActionButton>
          )}
          {!evaso && !spedito && order.customer_email && (
            <p className="-mt-3 text-fine text-on-paper-muted">
              Segnalo come evaso per poter mandare la mail.
            </p>
          )}
        </div>
      </article>

      {spedizione && (
        <ShippingSheet
          order={order}
          token={token}
          onClose={() => setSpedizione(false)}
          onSent={(u) => {
            onUpdated(u);
            setSpedizione(false);
          }}
        />
      )}
    </>
  );
}

export function OrdersTab({
  orders,
  token,
  onUpdated,
}: {
  orders: MerchOrder[];
  token: string;
  onUpdated: (o: MerchOrder) => void;
}) {
  const daEvadere = orders.filter((o) => o.status === 'da_evadere').length;
  const evasi = orders.filter((o) => o.status === 'evaso').length;
  const spediti = orders.filter((o) => o.status === 'spedito').length;

  if (orders.length === 0) {
    return (
      <EmptyState title="Nessun ordine" body="Quando qualcuno compra, l’ordine compare qui da solo." />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <StatusPill tone={daEvadere > 0 ? 'warn' : 'neutral'}>{daEvadere} da evadere</StatusPill>
        <StatusPill tone="good">{evasi} evasi</StatusPill>
        <StatusPill>{spediti} spediti</StatusPill>
      </div>

      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} token={token} onUpdated={onUpdated} />
        ))}
      </div>
    </div>
  );
}
