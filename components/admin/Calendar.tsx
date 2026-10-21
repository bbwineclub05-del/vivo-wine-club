'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

/**
 * One calendar for the whole reserved area.
 *
 * Tasks and the editorial plan each had their own month grid — around
 * three hundred lines apiece, with different week starts, different
 * colour rules and a seven-column grid that on a phone squeezed each
 * day into fifty pixels of unreadable text. This replaces both.
 *
 * The model is the calendar everyone already knows: a month of numbers
 * with coloured dots, and the day you tap opens as a list underneath.
 * On a phone that list *is* the interface — the grid is only there to
 * show you where the busy days are. On a desktop there is room for the
 * items to sit inside the cells, so they do.
 *
 * It knows nothing about tasks, posts or events: callers hand it
 * `items` tagged with a `source`, and the sources become the colours
 * and the toggles at the top.
 */

export interface CalendarItem {
  id: string;
  /** YYYY-MM-DD, local. */
  date: string;
  /** HH:MM, optional. Items with a time sort before those without. */
  time?: string | null;
  title: string;
  /** Which calendar this belongs to — a key in `sources`. */
  source: string;
  /** Second line in the day list. */
  detail?: string | null;
  /** A small extra dot, e.g. the team colour on a task. */
  tint?: string | null;
  /** Struck through and faded. */
  done?: boolean;
}

export interface CalendarSource {
  key: string;
  label: string;
  color: string;
}

export type CalendarView = 'month' | 'week' | 'agenda';

/* ── Dates ──────────────────────────────────────────────────────── */

/** Local YYYY-MM-DD. Never `toISOString`, which shifts by the offset. */
export function ymd(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(s: string) {
  return new Date(`${s.slice(0, 10)}T00:00:00`);
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Monday-first index: JS gives 0 for Sunday. */
function weekIndex(jsDay: number) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function startOfWeek(d: Date) {
  const out = new Date(d);
  out.setDate(out.getDate() - weekIndex(out.getDay()));
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday of the first week shown, so the grid always starts flush. */
function monthGridStart(year: number, month: number) {
  return startOfWeek(new Date(year, month, 1));
}

/**
 * How a date reads to someone looking at it today: the words first,
 * the numbers only when the words run out.
 */
export function relativeDay(date: string, today = ymd(new Date())) {
  if (date === today) return 'Oggi';
  const diff = Math.round(
    (parseYmd(date).getTime() - parseYmd(today).getTime()) / 86400000,
  );
  if (diff === 1) return 'Domani';
  if (diff === -1) return 'Ieri';
  const d = parseYmd(date);
  if (diff > 1 && diff < 7) return WEEKDAYS[weekIndex(d.getDay())];
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function longDay(date: string) {
  const d = parseYmd(date);
  return `${WEEKDAYS[weekIndex(d.getDay())]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/* ── Calendar ───────────────────────────────────────────────────── */

export function Calendar({
  items,
  sources,
  onItemClick,
  onDayAdd,
  addLabel = 'Aggiungi',
  emptyDayLabel = 'Niente in programma',
}: {
  items: CalendarItem[];
  sources: CalendarSource[];
  onItemClick?: (item: CalendarItem) => void;
  /** Shown as a button on the open day. Omit to hide it. */
  onDayAdd?: (date: string) => void;
  addLabel?: string;
  emptyDayLabel?: string;
}) {
  const today = ymd(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [openDay, setOpenDay] = useState<string>(today);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const colorOf = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sources) map[s.key] = s.color;
    return map;
  }, [sources]);

  /** Visible items, bucketed by day and sorted within each day. */
  const byDay = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    for (const it of items) {
      if (hidden.has(it.source)) continue;
      const key = it.date.slice(0, 10);
      (map[key] ??= []).push(it);
    }
    for (const day of Object.values(map)) {
      day.sort((a, b) => {
        if (!!a.time !== !!b.time) return a.time ? -1 : 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [items, hidden]);

  function toggleSource(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function goToday() {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setWeekAnchor(startOfWeek(d));
    setOpenDay(ymd(d));
  }

  function step(dir: -1 | 1) {
    if (view === 'week') {
      setWeekAnchor((w) => addDays(w, dir * 7));
      return;
    }
    setCursor(({ year, month }) => {
      const next = month + dir;
      if (next < 0) return { year: year - 1, month: 11 };
      if (next > 11) return { year: year + 1, month: 0 };
      return { year, month: next };
    });
  }

  /* ── The 42 cells of the month grid ── */
  const monthDays = useMemo(() => {
    const start = monthGridStart(cursor.year, cursor.month);
    return Array.from({ length: 42 }, (_, i) => {
      const d = addDays(start, i);
      return { date: ymd(d), day: d.getDate(), inMonth: d.getMonth() === cursor.month };
    });
    // A fixed 42 keeps the grid from reflowing as you page through months.
  }, [cursor]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekAnchor, i);
        return { date: ymd(d), day: d.getDate(), inMonth: true };
      }),
    [weekAnchor],
  );

  /** Everything from today on, for the agenda. */
  const agendaDays = useMemo(
    () =>
      Object.keys(byDay)
        .filter((d) => d >= today)
        .sort()
        .slice(0, 60),
    [byDay, today],
  );

  const periodLabel =
    view === 'week'
      ? (() => {
          const end = addDays(weekAnchor, 6);
          const sameMonth = end.getMonth() === weekAnchor.getMonth();
          return sameMonth
            ? `${weekAnchor.getDate()}–${end.getDate()} ${MONTHS[weekAnchor.getMonth()]}`
            : `${weekAnchor.getDate()} ${MONTHS[weekAnchor.getMonth()].slice(0, 3)} – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)}`;
        })()
      : `${MONTHS[cursor.month]} ${cursor.year}`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Header: where you are, and how to move.
          It has to hold on one line at 390px, so the title steps down
          and the arrows lose a few pixels there; wrapping "Oggi" onto a
          line of its own costs fifty pixels of height and pushes the
          grid under the fold. ── */}
      <div className="flex items-center gap-2 lg:gap-3">
        <h3 className="ds-display mr-auto truncate text-[19px] leading-none tracking-[-0.02em] lg:text-[26px]">
          {view === 'agenda' ? 'Prossimi giorni' : periodLabel}
        </h3>

        {view !== 'agenda' && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => step(-1)}
              aria-label="Periodo precedente"
              className="grid h-10 w-10 place-items-center rounded-full border border-rule-paper text-on-paper transition-colors hover:border-accent/40 lg:h-11 lg:w-11"
            >
              <ChevronLeft size={19} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => step(1)}
              aria-label="Periodo successivo"
              className="grid h-10 w-10 place-items-center rounded-full border border-rule-paper text-on-paper transition-colors hover:border-accent/40 lg:h-11 lg:w-11"
            >
              <ChevronRight size={19} strokeWidth={1.8} />
            </button>
          </div>
        )}

        <button
          onClick={goToday}
          className="min-h-[40px] shrink-0 rounded-full border border-rule-paper px-3.5 text-fine font-medium transition-colors hover:border-accent/40 lg:min-h-[44px] lg:px-4"
        >
          Oggi
        </button>
      </div>

      {/* ── View switch. Full width on a phone, where the thumb wants
          the whole row; its own size on a desktop, where stretching
          three words across a thousand pixels just looks lost. ── */}
      <div className="flex rounded-full border border-rule-paper p-1 lg:w-fit">
        {(
          [
            { id: 'month', label: 'Mese' },
            { id: 'week', label: 'Settimana' },
            { id: 'agenda', label: 'Elenco' },
          ] as { id: CalendarView; label: string }[]
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={`min-h-[42px] flex-1 rounded-full px-3 text-fine font-medium transition-colors lg:flex-none lg:px-7 ${
              view === v.id ? 'bg-accent text-paper' : 'text-on-paper-muted hover:text-on-paper'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Which calendars are showing ── */}
      {sources.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => {
            const on = !hidden.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleSource(s.key)}
                aria-pressed={on}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors ${
                  on ? 'border-rule-paper text-on-paper' : 'border-rule-paper/60 text-on-paper-muted/60'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: on ? s.color : 'transparent',
                    borderColor: s.color,
                  }}
                />
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grid ── */}
      {view !== 'agenda' && (
        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-medium uppercase tracking-[0.1em] text-on-paper-muted"
              >
                <span className="lg:hidden">{w.charAt(0)}</span>
                <span className="hidden lg:inline">{w}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {(view === 'month' ? monthDays : weekDays).map((cell) => (
              <DayCell
                key={cell.date}
                cell={cell}
                items={byDay[cell.date] ?? []}
                colorOf={colorOf}
                isToday={cell.date === today}
                isOpen={cell.date === openDay}
                onOpen={() => setOpenDay(cell.date)}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── The open day, in full. On a phone this is the real interface. ── */}
      {view !== 'agenda' && (
        <DayPanel
          date={openDay}
          items={byDay[openDay] ?? []}
          colorOf={colorOf}
          onItemClick={onItemClick}
          onDayAdd={onDayAdd}
          addLabel={addLabel}
          emptyLabel={emptyDayLabel}
        />
      )}

      {/* ── Agenda ── */}
      {view === 'agenda' && (
        <div className="flex flex-col gap-5">
          {agendaDays.length === 0 && (
            <p className="rounded-2xl border border-dashed border-rule-paper px-5 py-10 text-center text-body text-on-paper-muted">
              Niente in programma da qui in avanti.
            </p>
          )}
          {agendaDays.map((date) => (
            <div key={date}>
              <div className="mb-2 flex items-baseline gap-2.5">
                <span className="text-subtitle font-medium">{relativeDay(date, today)}</span>
                <span className="text-fine text-on-paper-muted">{longDay(date)}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {byDay[date].map((it) => (
                  <ItemRow key={it.id} item={it} colorOf={colorOf} onClick={onItemClick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── One cell of the grid ───────────────────────────────────────── */

function DayCell({
  cell,
  items,
  colorOf,
  isToday,
  isOpen,
  onOpen,
  onItemClick,
}: {
  cell: { date: string; day: number; inMonth: boolean };
  items: CalendarItem[];
  colorOf: Record<string, string>;
  isToday: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onItemClick?: (item: CalendarItem) => void;
}) {
  // Up to three dots on a phone: past that the count says more than the
  // dots do, and four dots in 50px start to touch.
  const dots = items.slice(0, 3);

  return (
    <button
      onClick={onOpen}
      aria-label={longDay(cell.date)}
      aria-current={isToday ? 'date' : undefined}
      className={`flex min-h-[58px] flex-col items-center gap-1 rounded-xl border p-1 text-left transition-colors lg:min-h-[104px] lg:items-stretch lg:gap-1.5 lg:p-1.5 ${
        isOpen ? 'border-accent/55 bg-accent/5' : 'border-transparent hover:bg-paper-soft'
      } ${cell.inMonth ? '' : 'opacity-35'}`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-fine font-medium lg:h-6 lg:w-6 lg:self-start ${
          isToday ? 'bg-accent text-paper' : 'text-on-paper'
        }`}
      >
        {cell.day}
      </span>

      {/* Phone: dots. There is no room for words. */}
      <span className="flex flex-wrap justify-center gap-[3px] lg:hidden">
        {dots.map((it) => (
          <span
            key={it.id}
            className="h-[5px] w-[5px] rounded-full"
            style={{ backgroundColor: colorOf[it.source] ?? 'currentColor', opacity: it.done ? 0.4 : 1 }}
          />
        ))}
      </span>

      {/* Desktop: the items themselves. */}
      <span className="hidden min-w-0 flex-col gap-1 lg:flex">
        {items.slice(0, 3).map((it) => (
          <span
            key={it.id}
            onClick={(e) => {
              if (!onItemClick) return;
              e.stopPropagation();
              onItemClick(it);
            }}
            className={`block truncate rounded-md px-1.5 py-[3px] text-[11.5px] leading-tight ${
              onItemClick ? 'cursor-pointer hover:brightness-95' : ''
            } ${it.done ? 'line-through opacity-55' : ''}`}
            style={{
              backgroundColor: `${colorOf[it.source] ?? '#731515'}14`,
              color: colorOf[it.source] ?? '#731515',
            }}
          >
            {it.time ? `${it.time.slice(0, 5)} ` : ''}
            {it.title}
          </span>
        ))}
        {items.length > 3 && (
          <span className="px-1.5 text-[11px] text-on-paper-muted">+{items.length - 3}</span>
        )}
      </span>
    </button>
  );
}

/* ── The open day ───────────────────────────────────────────────── */

function DayPanel({
  date,
  items,
  colorOf,
  onItemClick,
  onDayAdd,
  addLabel,
  emptyLabel,
}: {
  date: string;
  items: CalendarItem[];
  colorOf: Record<string, string>;
  onItemClick?: (item: CalendarItem) => void;
  onDayAdd?: (date: string) => void;
  addLabel: string;
  emptyLabel: string;
}) {
  return (
    <section className="border-t border-rule-paper pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h4 className="mr-auto text-subtitle font-medium">{longDay(date)}</h4>
        {onDayAdd && (
          <button
            onClick={() => onDayAdd(date)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-accent px-4 text-fine font-medium text-paper transition-colors hover:bg-accent-lift"
          >
            <Plus size={16} strokeWidth={2} />
            {addLabel}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-body text-on-paper-muted">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <ItemRow key={it.id} item={it} colorOf={colorOf} onClick={onItemClick} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ── One item, as a row ─────────────────────────────────────────── */

function ItemRow({
  item,
  colorOf,
  onClick,
}: {
  item: CalendarItem;
  colorOf: Record<string, string>;
  onClick?: (item: CalendarItem) => void;
}) {
  const color = colorOf[item.source] ?? '#731515';

  const body: ReactNode = (
    <>
      <span className="w-[52px] shrink-0 text-fine tabular-nums text-on-paper-muted">
        {item.time ? item.time.slice(0, 5) : '—'}
      </span>
      <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-body ${item.done ? 'line-through opacity-55' : ''}`}>
          {item.title}
        </span>
        {item.detail && (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-fine text-on-paper-muted">
            {item.tint && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.tint }}
              />
            )}
            {item.detail}
          </span>
        )}
      </span>
    </>
  );

  const shell =
    'flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-rule-paper px-3 text-left transition-colors';

  if (!onClick) return <div className={shell}>{body}</div>;

  return (
    <button onClick={() => onClick(item)} className={`${shell} hover:border-accent/40 hover:bg-paper-soft`}>
      {body}
    </button>
  );
}
