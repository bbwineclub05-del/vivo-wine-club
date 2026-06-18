'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Wine, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
          <p className="text-[13px] font-semibold text-[#1a0505] mt-2 mb-1 leading-snug first:mt-0" style={{ fontFamily: 'var(--font-syne)' }}>{children}</p>
        ),
        h2: ({ children }) => (
          <p className="text-[12px] font-semibold text-[#1a0505] mt-2 mb-0.5 leading-snug first:mt-0" style={{ fontFamily: 'var(--font-syne)' }}>{children}</p>
        ),
        h3: ({ children }) => (
          <p className="text-[11px] font-semibold text-[#3d0808] mt-1.5 mb-0.5 leading-snug first:mt-0">{children}</p>
        ),
        p: ({ children }) => (
          <p className="text-[13px] leading-relaxed text-[#1a0505] mb-1.5 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => <strong className="font-semibold text-[#1a0505]">{children}</strong>,
        em: ({ children }) => <em className="italic text-[#5a2020]">{children}</em>,
        ul: ({ children }) => <ul className="my-1 space-y-0.5 pl-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="my-1 space-y-0.5 pl-1 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex gap-1.5 items-start text-[13px] leading-relaxed text-[#1a0505]">
            <span className="mt-[5px] text-[#c84040] shrink-0 text-[7px]">●</span>
            <span>{children}</span>
          </li>
        ),
        hr: () => <div className="my-1.5 h-px bg-[#eddada]" />,
        blockquote: ({ children }) => (
          <div className="border-l-2 border-[#731515]/30 pl-2.5 my-1.5 text-[#5a2020] italic text-[13px]">{children}</div>
        ),
        code: ({ children }) => (
          <code className="bg-[#fdf6f6] border border-[#eddada] text-[#731515] text-[10px] px-1 py-0.5 rounded">{children}</code>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-1.5">
            <table className="text-[11px] border-collapse w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#fdf6f6]">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-[#eddada] px-2 py-1 text-left font-semibold text-[#1a0505]">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-[#eddada] px-2 py-1 text-[#3a1a1a]">{children}</td>
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
          className="w-1.5 h-1.5 rounded-full bg-[#7a4a4a]/40"
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
        <div className="w-6 h-6 rounded-full bg-[#5b1a14] flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
          <Wine size={11} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] px-3 py-2 rounded-xl shadow-sm text-[13px] leading-relaxed ${
          isUser
            ? 'bg-[#5b1a14] text-white rounded-tr-sm'
            : 'bg-white border border-[#eddada] text-[#1a0505] rounded-tl-sm'
        }`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        {isUser ? msg.content : <AssistantMarkdown content={msg.content} />}
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

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

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const history = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res  = await fetch('/api/wine-assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, history }),
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
              bg-[#fdf9f9] border border-[#eddada]
              bottom-[84px] left-4
              w-[calc(100vw-2rem)] max-w-[380px]
              h-[min(500px,calc(100dvh-120px))]
              sm:w-[380px] sm:h-[500px]
            `}
            style={{ transformOrigin: 'bottom left' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#5b1a14] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Wine size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-medium leading-none" style={{ fontFamily: 'var(--font-syne)' }}>
                    Wine Assistant
                  </p>
                  <p className="text-white/55 text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Vivo Wine Club · Sommelier AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
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
                  <div className="w-6 h-6 rounded-full bg-[#5b1a14] flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
                    <Wine size={11} className="text-white" />
                  </div>
                  <div className="bg-white border border-[#eddada] rounded-xl rounded-tl-sm px-3 py-2 shadow-sm">
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
                    className="px-2.5 py-1 bg-white border border-[#eddada] text-[#5b1a14] text-[10px] tracking-wide rounded-full hover:bg-[#fdf6f6] hover:border-[#731515]/30 transition-colors"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 shrink-0">
              <div className="flex items-center gap-2 bg-white border border-[#eddada] rounded-xl px-3 py-2 focus-within:border-[#5b1a14]/40 transition-colors">
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
                  className="flex-1 bg-transparent text-[#1a0505] text-[13px] placeholder:text-[#7a4a4a]/35 focus:outline-none"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg bg-[#5b1a14] text-white flex items-center justify-center hover:bg-[#7a2020] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
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
        {/* Hover label */}
        <AnimatePresence>
          {!open && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              className="
                origin-left pointer-events-none
                group-hover:opacity-100 opacity-0
                bg-[#1a0505] text-white text-[10px] tracking-[0.25em] px-3 py-1.5 rounded-full
                shadow-lg whitespace-nowrap
              "
            >
              Ask the Sommelier
            </motion.div>
          )}
        </AnimatePresence>

        <div className="group relative">
          {/* Tooltip on hover */}
          {!open && (
            <div className="
              absolute bottom-full left-0 mb-2
              pointer-events-none
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              bg-[#1a0505] text-white text-[10px] tracking-[0.2em] px-3 py-1.5 rounded-full
              shadow-lg whitespace-nowrap
            ">
              Ask the Sommelier
            </div>
          )}

          {/* Pulse ring — plays 3 times then stops */}
          {!pulseDone && !open && (
            <span className="absolute inset-0 rounded-full animate-ping bg-[#5b1a14] opacity-30" />
          )}

          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Wine Assistant"
            className={`
              relative w-12 h-12 sm:w-14 sm:h-14 rounded-full
              flex items-center justify-center
              shadow-[0_4px_20px_rgba(91,26,20,0.45)]
              transition-all duration-200
              ${open
                ? 'bg-[#3d0808] scale-95'
                : 'bg-[#5b1a14] hover:bg-[#7a2020] hover:scale-105 active:scale-95'
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
