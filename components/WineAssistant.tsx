'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Wine, Camera, X } from 'lucide-react';
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
   Suggestion chip sets — one set per session
───────────────────────────────────────────── */
const SUGGESTION_SETS = [
  ['Tell me about Barolo', 'Best wine for pasta?', 'Champagne vs Prosecco', 'Explore Bordeaux'],
  ['What is Brunello di Montalcino?', 'Wine for sushi?', 'Best Burgundy producers', 'Natural wine explained'],
  ['Amarone della Valpolicella', 'Wine for a summer BBQ', 'Top Champagne houses', 'Rioja vs Ribera del Duero'],
  ['Sassicaia vs Tignanello', 'Pairing wine with cheese', 'Discover Alsace wines', 'What is orange wine?'],
];

function pickSuggestions(): string[] {
  return SUGGESTION_SETS[Math.floor(Math.random() * SUGGESTION_SETS.length)];
}

/* ─────────────────────────────────────────────
   Typing dots animation
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
   Markdown prose — scoped styles via className
───────────────────────────────────────────── */
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        // Headings
        h1: ({ children }) => (
          <p className="text-[15px] font-semibold text-[#1a0505] mt-3 mb-1 leading-snug first:mt-0" style={{ fontFamily: 'var(--font-syne)' }}>
            {children}
          </p>
        ),
        h2: ({ children }) => (
          <p className="text-[13px] font-semibold text-[#1a0505] mt-3 mb-1 leading-snug first:mt-0" style={{ fontFamily: 'var(--font-syne)' }}>
            {children}
          </p>
        ),
        h3: ({ children }) => (
          <p className="text-[12px] font-semibold text-[#3d0808] mt-2 mb-0.5 leading-snug first:mt-0">
            {children}
          </p>
        ),
        // Paragraph
        p: ({ children }) => (
          <p className="text-sm leading-relaxed text-[#1a0505] mb-1.5 last:mb-0">
            {children}
          </p>
        ),
        // Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-[#1a0505]">{children}</strong>
        ),
        // Italic
        em: ({ children }) => (
          <em className="italic text-[#5a2020]">{children}</em>
        ),
        // Unordered list
        ul: ({ children }) => (
          <ul className="my-1.5 space-y-0.5 pl-1">{children}</ul>
        ),
        // Ordered list
        ol: ({ children }) => (
          <ol className="my-1.5 space-y-0.5 pl-1 list-decimal list-inside">{children}</ol>
        ),
        // List item
        li: ({ children }) => (
          <li className="flex gap-2 items-start text-sm leading-relaxed text-[#1a0505]">
            <span className="mt-[5px] text-[#c84040] shrink-0 text-[8px]">●</span>
            <span>{children}</span>
          </li>
        ),
        // Horizontal rule — hide raw ---
        hr: () => (
          <div className="my-2 h-px bg-[#eddada]" />
        ),
        // Blockquote
        blockquote: ({ children }) => (
          <div className="border-l-2 border-[#731515]/30 pl-3 my-2 text-[#5a2020] italic text-sm">
            {children}
          </div>
        ),
        // Inline code
        code: ({ children }) => (
          <code className="bg-[#fdf6f6] border border-[#eddada] text-[#731515] text-[11px] px-1 py-0.5 rounded">
            {children}
          </code>
        ),
        // Code block
        pre: ({ children }) => (
          <pre className="bg-[#fdf6f6] border border-[#eddada] rounded-lg p-3 my-2 text-[11px] overflow-x-auto">
            {children}
          </pre>
        ),
        // Table
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[#fdf6f6]">{children}</thead>,
        th: ({ children }) => (
          <th className="border border-[#eddada] px-2 py-1.5 text-left font-semibold text-[#1a0505]">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-[#eddada] px-2 py-1.5 text-[#3a1a1a]">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ─────────────────────────────────────────────
   Message bubble
───────────────────────────────────────────── */
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#731515] flex items-center justify-center shrink-0 mr-2.5 mt-0.5 shadow-sm">
          <Wine size={13} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-[#731515] text-white rounded-tr-sm text-sm leading-relaxed'
            : 'bg-white border border-[#eddada] text-[#1a0505] rounded-tl-sm'
        }`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      >
        {isUser ? (
          <>
            {msg.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.imageUrl}
                alt="Etichetta caricata"
                className="w-full max-w-[220px] rounded-lg mb-2 border border-white/20"
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
   Main component
───────────────────────────────────────────── */
export default function WineAssistant() {
  const WELCOME: Message = {
    id: 'welcome',
    role: 'assistant',
    content: 'Ciao! Sono il tuo sommelier virtuale. Chiedimi tutto sul vino — bottiglie, abbinamenti, regioni, annate, produttori. 🍷',
  };

  const [messages,      setMessages]      = useState<Message[]>([WELCOME]);
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [suggestions]   = useState<string[]>(() => pickSuggestions());
  const [pendingImage,  setPendingImage]  = useState<PendingImage | null>(null);
  const [imageError,    setImageError]    = useState<string | null>(null);
  const bottomRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setImageError(null);
    try {
      const resized = await resizeImageForUpload(file);
      setPendingImage(resized);
    } catch {
      setImageError('Impossibile leggere la foto. Riprova.');
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
        content: 'Scusa, si è verificato un errore. Riprova tra un momento.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[780px] min-h-[480px]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 pb-5 mb-2 border-b border-[#eddada] shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#731515] to-[#3d0808] flex items-center justify-center shadow-sm">
          <Wine size={18} className="text-white" />
        </div>
        <div>
          <h2
            className="text-xl font-light text-[#1a0505] leading-none"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Wine Assistant
          </h2>
          <p
            className="text-[11px] text-[#7a4a4a]/60 mt-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Ask anything about wine
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-4 pr-1">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <Bubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-start mb-3"
          >
            <div className="w-7 h-7 rounded-full bg-[#731515] flex items-center justify-center shrink-0 mr-2.5 mt-0.5 shadow-sm">
              <Wine size={13} className="text-white" />
            </div>
            <div className="bg-white border border-[#eddada] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Suggestion chips ── */}
      {messages.length <= 1 && !loading && (
        <div className="flex flex-wrap gap-2 py-3 shrink-0">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 bg-[#fdf6f6] border border-[#eddada] text-[#731515] text-[11px] tracking-wide rounded-full hover:bg-[#f9ecec] hover:border-[#731515]/30 transition-colors"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="shrink-0 pt-3 border-t border-[#eddada]">
        {imageError && (
          <p className="text-[11px] text-[#731515] mb-2" style={{ fontFamily: 'var(--font-nunito)' }}>{imageError}</p>
        )}
        {pendingImage && (
          <div className="flex items-center gap-2 mb-2 bg-[#fdf6f6] border border-[#eddada] rounded-xl px-3 py-2 w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage.dataUrl} alt="Anteprima etichetta" className="w-10 h-10 rounded-lg object-cover" />
            <span className="text-[11px] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>Foto pronta — descrivi o invia direttamente</span>
            <button
              onClick={() => setPendingImage(null)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-white transition-colors"
              aria-label="Rimuovi foto"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-[#fdf6f6] border border-[#eddada] rounded-2xl px-4 py-3 focus-within:border-[#731515]/40 transition-colors">
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
            title="Scatta o carica una foto dell'etichetta"
            className="shrink-0 w-8 h-8 rounded-xl border border-[#eddada] bg-white text-[#731515] flex items-center justify-center hover:bg-[#fdf0f0] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Camera size={14} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a wine, region, pairing… or attach a label photo"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[#1a0505] text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none leading-relaxed max-h-28 overflow-y-auto"
            style={{ fontFamily: 'var(--font-nunito)', height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 112)}px`;
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={(!input.trim() && !pendingImage) || loading}
            className="shrink-0 w-8 h-8 rounded-xl bg-[#731515] text-white flex items-center justify-center hover:bg-[#9b2323] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
          >
            <Send size={13} />
          </button>
        </div>
        <p
          className="text-[9px] text-[#7a4a4a]/30 text-center mt-2"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

    </div>
  );
}
