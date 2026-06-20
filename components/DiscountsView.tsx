'use client';

import { useEffect, useState } from 'react';
import { Loader2, GlassWater, Copy, Check } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Discount {
  id:          string;
  title:       string;
  description: string | null;
  logo_url:    string | null;
  code:        string | null;
  partner:     string | null;
  expires_at:  string | null;
  visible:     boolean;
  sort_order:  number;
  created_at:  string;
}

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: ignore
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className="p-1 rounded text-[#731515]/50 hover:text-[#731515] transition-colors"
    >
      {copied ? <Check size={11} className="text-[#2d6e2d]" /> : <Copy size={11} />}
    </button>
  );
}

// ── Discount card ──────────────────────────────────────────────────────────────

function DiscountCard({ discount }: { discount: Discount }) {
  const expiryStr = discount.expires_at
    ? new Date(discount.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.06),0_4px_16px_rgba(107,26,26,0.03)] flex flex-col gap-3">
      {/* Logo + partner/title */}
      <div className="flex items-start gap-3">
        {discount.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={discount.logo_url}
            alt={discount.partner ?? discount.title}
            className="w-10 h-10 rounded-lg object-cover border border-[#eddada] shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#fdf6f6] border border-[#eddada] flex items-center justify-center shrink-0">
            <GlassWater size={16} className="text-[#731515]/35" strokeWidth={1.5} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {discount.partner && (
            <div className="text-[10px] tracking-[0.35em] text-[#731515] uppercase mb-0.5 truncate">
              {discount.partner}
            </div>
          )}
          <h3
            className="text-[18px] font-light text-[#1a0505] leading-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {discount.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      {discount.description && (
        <p
          className="text-[12.5px] text-[#7a4a4a] font-light leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {discount.description}
        </p>
      )}

      {/* Expiry */}
      {expiryStr && (
        <p className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
          Expires {expiryStr}
        </p>
      )}

      {/* Code chip */}
      {discount.code && (
        <div className="flex items-center gap-2 mt-auto pt-1">
          <span className="px-3 py-1.5 bg-[#f8f0f0] border border-[#eddada] text-[#731515] text-[12px] font-mono rounded-lg">
            {discount.code}
          </span>
          <CopyButton text={discount.code} />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DiscountsView({ token }: { token: string }) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res  = await fetch('/api/discounts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed to load deals'); return; }
        setDiscounts(data.discounts ?? []);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={22} className="animate-spin text-[#731515]/40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#731515]/8 border border-[#731515]/20 text-[#731515] text-sm px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (discounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-[#fdf6f6] border border-[#eddada] flex items-center justify-center mb-4">
          <GlassWater size={22} className="text-[#731515]/30" strokeWidth={1.5} />
        </div>
        <p className="text-[9px] tracking-[0.5em] text-[#7a4a4a]/40 uppercase mb-2">No deals yet</p>
        <p
          className="text-sm text-[#7a4a4a]/50 font-light"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          No deals or perks available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {discounts.map(d => (
        <DiscountCard key={d.id} discount={d} />
      ))}
    </div>
  );
}
