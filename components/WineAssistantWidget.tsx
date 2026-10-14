'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Wine, X, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { resizeImageForUpload } from '@/lib/imageResize';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface PendingImage {
  base64:    string;
  mediaType: string;
  dataUrl:   string;
}

/* ─────────────────────────────────────────────
   Locale helpers
───────────────────────────────────────────── */
function getLocale(): 'it' | 'en' | 'fr' {
  if (typeof document === 'undefined') return 'en';
  const lang = document.documentElement.lang ?? 'en';
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('fr')) return 'fr';
  return 'en';
}

const WELCOME: Record<'it' | 'en' | 'fr', string> = {
  it: 'Ciao! Sono il sommelier virtuale di Vivo Wine Club. Chiedimi tutto sul vino — bottiglie, abbinamenti, regioni, annate. 🍷',
  en: "Hi! I'm Vivo Wine Club's virtual sommelier. Ask me anything about wine — bottles, pairings, regions, vintages. 🍷",
  fr: 'Bonjour! Je suis le sommelier virtuel de Vivo Wine Club. Posez-moi toutes vos questions sur le vin — bouteilles, accords, régions, millésimes. 🍷',
};

const SUGGESTIONS: Record<'it' | 'en' | 'fr', string[]> = {
  it: ['Parlami del Barolo', 'Vino ideale per il pesce?', 'Champagne vs Franciacorta'],
  en: ['Tell me about Barolo', 'Best wine for fish?', 'Champagne vs Franciacorta'],
  fr: ['Parlez-moi du Barolo', 'Meilleur vin pour le poisson?', 'Champagne vs Franciacorta'],
};

/* ─────────────────────────────────────────────
   Markdown renderer (reused from WineAssistant)
───────────────────────────────────────────── */
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <p className="text-[13px] font-semibold text-[var(--color-ink)] mt-2 mb-1 leading-snug first:mt-0" style={{ fontFamily: 'var(--font-syne)' }}>{children}</p>
        ),
        h2: ({ children }) => (
          <p className="text-[12px] font-semibold text-[var(--color-ink)] mt-2 mb-0.5 leading-snug first:mt-0" style={{ fontFamily: 'var(--font-syne)' }}>{children}</p>
        ),
        h3: ({ children }) => (
          <p className="text-[11px] font-semibold text-[var(--color-ink)] mt-1.5 mb-0.5 leading-snug first:mt-0">{children}</p>
        ),
        p: ({ children }) => (
          <p className="text-[13px] leading-relaxed text-[var(--color-ink)] mb-1.5 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold text-[var(--color-ink)]">{children}</strong>,
        em: ({ children }) => <em className="italic text-[var(--color-on-paper-muted)]">{children}</em>,
        ul: ({ children }) => <ul className="my-1 space-y-0.5 pl-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 space-y-0.5 pl-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-1.5 items-start text-[13px] leading-relaxed text-[var(--color-ink)]">
            <span className="mt-[5px] text-[var(--color-accent-soft)] shrink-0 text-[7px]">●</span>
            <span>{children}</span>
          </li>
        ),
        hr: () => <div className="my-1.5 h-px bg-[var(--color-rule-paper)]" />,
        blockquote: ({ children }) => (
          <div className="border-l-2 border-[var(--color-accent)]/30 pl-2.5 my-1.5 text-[var(--color-on-paper-muted)] italic text-[13px]">{children}</div>
        ),
        code: ({ children }) => (
          <code className="bg-[var(--color-paper-soft)] border border-[var(--color-rule-paper)] text-[var(--color-accent)] text-[10px] px-1 py-0.5 rounded">{children}</code>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-1.5">
            <table className="text-[11px] border-collapse w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[var(--color-paper-soft)]">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-[var(--color-rule-paper)] px-2 py-1 text-left font-semibold text-[var(--color-ink)]">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-[var(--color-rule-paper)] px-2 py-1 text-[var(--color-on-paper-muted)]">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ─────────────────────────────────────────────
   Typing dots
───────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-on-paper-muted)]/40"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Message bubble
───────────────────────────────────────────── */
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2.5`}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
          <Wine size={11} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] px-3 py-2 rounded-xl shadow-sm text-[13px] leading-relaxed ${
          isUser
            ? 'bg-[var(--color-accent)] text-white rounded-tr-md'
            : 'bg-white border border-[var(--color-rule-paper)] text-[var(--color-ink)] rounded-tl-md'
        }`}
        style={{ fontFamily: 'var(--font-geist)' }}
      >
        {isUser ? (
          <>
            {msg.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.imageUrl}
                alt="Etichetta caricata"
                className="w-full max-w-[180px] rounded-lg mb-1.5 border border-white/20"
              />
            )}
            {msg.content && <span>{msg.content}</span>}
          </>
        ) : (
          <AssistantMarkdown content={msg.content} />
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Main widget
───────────────────────────────────────────── */
export default function WineAssistantWidget() {
  const pathname = usePathname();

  // Don't render on admin/internal pages
  const hidden = pathname?.startsWith('/members') || pathname?.startsWith('/checkin');
  if (hidden) return null;

  return <WidgetInner />;
}

/* Inner component — keeps all state away from the pathname check */
function WidgetInner() {
  const [open,        setOpen]        = useState(false);
  const [pulseDone,   setPulseDone]   = useState(false);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [locale,      setLocale]      = useState<'it' | 'en' | 'fr'>('en');
  const [initialized, setInitialized] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [imageError,   setImageError]   = useState<string | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // Detect locale on mount
  useEffect(() => {
    const l = getLocale();
    setLocale(l);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: WELCOME[l],
    }]);
    setInitialized(true);
  }, []);

  // Pulse button for 3 cycles then stop
  useEffect(() => {
    const t = setTimeout(() => setPulseDone(true), 3600);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError(null);
    try {
      const resized = await resizeImageForUpload(file);
      setPendingImage(resized);
    } catch {
      setImageError(
        locale === 'it' ? 'Impossibile leggere la foto. Riprova.'
        : locale === 'fr' ? 'Impossible de lire la photo. Réessayez.'
        : "Couldn't read that photo. Please try again.",
      );
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    const image = pendingImage;
    if ((!trimmed && !image) || loading) return;

    const userMsg: Message = {
      id:       Date.now().toString(),
      role:     'user',
      content:  trimmed,
      imageUrl: image?.dataUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res  = await fetch('/api/wine-assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: trimmed,
          history,
          image:          image?.base64,
          imageMediaType: image?.mediaType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore');
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: json.reply,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id:      (Date.now() + 1).toString(),
        role:    'assistant',
        content: locale === 'it'
          ? 'Scusa, si è verificato un errore. Riprova.'
          : locale === 'fr'
            ? 'Désolé, une erreur est survenue. Réessayez.'
            : 'Sorry, something went wrong. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); sendMessage(input); }
  }

  if (!initialized) return null;

  const chips = SUGGESTIONS[locale];

  return (
    <>
      {/* ── Chat panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit ={{ opacity: 0, scale: 0.92, y: 16  }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`
              fixed z-[9998] shadow-2xl rounded-2xl overflow-hidden flex flex-col
              bg-[var(--color-paper)] border border-[var(--color-rule-paper)] ds
              bottom-[76px] left-3 right-3
              w-auto max-w-[380px]
              h-[min(440px,calc(100dvh-140px))]
              sm:left-6 sm:right-auto sm:bottom-[88px] sm:w-[380px] sm:h-[500px]
            `}
            style={{ transformOrigin: 'bottom left' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-accent)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Wine size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                    Wine Assistant
                  </p>
                  <p className="text-white/55 text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-geist)' }}>
                    Vivo Wine Club · Sommelier AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <X size={14} className="text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <AnimatePresence initial={false}>
                {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
              </AnimatePresence>

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start mb-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
                    <Wine size={11} className="text-white" />
                  </div>
                  <div className="bg-white border border-[var(--color-rule-paper)] rounded-xl rounded-tl-sm px-3 py-2 shadow-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Chips — visible while only welcome message shown */}
            {messages.length <= 1 && !loading && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {chips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => sendMessage(chip)}
                    className="min-h-[36px] rounded-full border border-[var(--color-rule-paper)] bg-white px-3.5 text-[11px] text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-paper-soft)]"
                    style={{ fontFamily: 'var(--font-geist)' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              {imageError && (
                <p className="text-[10px] text-[var(--color-accent)] mb-1.5" style={{ fontFamily: 'var(--font-geist)' }}>{imageError}</p>
              )}
              {pendingImage && (
                <div className="flex items-center gap-2 mb-1.5 bg-[var(--color-paper-soft)] border border-[var(--color-rule-paper)] rounded-lg px-2 py-1.5 w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImage.dataUrl} alt="Anteprima" className="w-8 h-8 rounded-md object-cover" />
                  <span className="text-[10px] text-[var(--color-on-paper-muted)]" style={{ fontFamily: 'var(--font-geist)' }}>
                    {locale === 'it' ? 'Foto pronta' : locale === 'fr' ? 'Photo prête' : 'Photo ready'}
                  </span>
                  <button
                    onClick={() => setPendingImage(null)}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--color-on-paper-muted)]/50 hover:text-[var(--color-accent)] hover:bg-white transition-colors"
                    aria-label="Remove photo"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white border border-[var(--color-rule-paper)] rounded-2xl px-3 py-2 focus-within:border-[var(--color-accent)]/40 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  title={locale === 'it' ? "Scatta o carica una foto dell'etichetta" : 'Attach a label photo'}
                  className="shrink-0 grid h-11 w-11 place-items-center rounded-full text-[var(--color-accent)] hover:bg-[var(--color-paper-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Camera size={13} />
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    locale === 'it' ? 'Chiedimi del vino…'
                    : locale === 'fr' ? 'Posez votre question…'
                    : 'Ask me anything about wine…'
                  }
                  className="flex-1 bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-on-paper-muted)]/35 focus:outline-none min-w-0"
                  style={{ fontFamily: 'var(--font-geist)', fontSize: '16px' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={(!input.trim() && !pendingImage) || loading}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-lift)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating button ── */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[9999] flex flex-col items-start gap-2">
        <div className="group relative">
          {/* Tooltip on hover */}
          {!open && (
            <div className="
              absolute bottom-full left-0 mb-2
              pointer-events-none
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              bg-[var(--color-ink)] text-white text-[10px] tracking-[0.2em] px-3 py-1.5 rounded-full
              shadow-lg whitespace-nowrap
            ">
              Ask the Sommelier
            </div>
          )}

          {/* Pulse ring — plays 3 times then stops */}
          {!pulseDone && !open && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[var(--color-accent)] opacity-30" />
          )}

          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Wine Assistant"
            className={`
              relative w-12 h-12 sm:w-14 sm:h-14 rounded-full
              flex items-center justify-center
              shadow-[0_2px_6px_rgba(26,5,5,0.2),0_14px_36px_-12px_rgba(115,21,21,0.55)]
              transition-all duration-200
              ${open
                ? 'bg-[var(--color-ink)] scale-95'
                : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-lift)] hover:scale-105 active:scale-95'
              }
            `}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0,   opacity: 1 }}
                  exit ={{ rotate:  90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X size={20} className="text-white" />
                </motion.span>
              ) : (
                <motion.span
                  key="wine"
                  initial={{ rotate: 90,  opacity: 0 }}
                  animate={{ rotate: 0,   opacity: 1 }}
                  exit ={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Wine size={22} className="text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </>
  );
}
