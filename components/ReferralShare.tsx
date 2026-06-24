'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Gift, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const REWARD_THRESHOLD = 5;

interface Props {
  referralCode?:          string | null;  // null/undefined = still generating
  eventSlug:              string;
  eventTitle:             string;
  loading?:               boolean;
  initialUses?:           number;
  initialRewardUnlocked?: boolean;
  initialRewardCode?:     string | null;
}

export default function ReferralShare({
  referralCode,
  eventSlug,
  eventTitle,
  loading                = false,
  initialUses            = 0,
  initialRewardUnlocked  = false,
  initialRewardCode      = null,
}: Props) {
  const t = useTranslations('events');

  const [uses,           setUses]           = useState(initialUses);
  const [rewardUnlocked, setRewardUnlocked] = useState(initialRewardUnlocked);
  const [rewardCode,     setRewardCode]     = useState<string | null>(initialRewardCode);
  const [copied,         setCopied]         = useState(false);

  const isLoading = loading;

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${eventSlug}${referralCode ? `?ref=${referralCode}` : ''}`
    : `https://vivowineclub.com/events/${eventSlug}${referralCode ? `?ref=${referralCode}` : ''}`;

  // Poll for status updates every 30s (only when code is known)
  const fetchStatus = useCallback(async () => {
    if (!referralCode) return;
    try {
      const res = await fetch(`/api/referral/status?code=${referralCode}`);
      if (!res.ok) return;
      const data = await res.json();
      setUses(data.uses ?? 0);
      setRewardUnlocked(data.reward_unlocked ?? false);
      setRewardCode(data.reward_code ?? null);
    } catch {/* non-fatal */}
  }, [referralCode]);

  useEffect(() => {
    if (!referralCode) return;
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus, referralCode]);

  async function copyLink() {
    if (isLoading) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  }

  function shareWhatsApp() {
    if (isLoading) return;
    const text = t('referralWhatsApp', { event: eventTitle, link: shareUrl });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  function shareEmail() {
    if (isLoading) return;
    const subject = encodeURIComponent(t('referralEmailSubject', { event: eventTitle }));
    const body    = encodeURIComponent(t('referralEmailBody',    { event: eventTitle, link: shareUrl }));
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  const progress = Math.min(uses / REWARD_THRESHOLD, 1);
  const remaining = Math.max(REWARD_THRESHOLD - uses, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 bg-[#fdf6f6] border border-[#eddada] rounded-xl p-6 sm:p-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-[#731515]/10 flex items-center justify-center shrink-0">
          <Share2 size={16} className="text-[#731515]" />
        </div>
        <div>
          <div className="text-[9px] tracking-[0.5em] text-[#731515] mb-0.5">{t('referralLabel')}</div>
          <p className="text-base font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
            {t('referralHeading')}
          </p>
        </div>
      </div>

      {/* Referral code pill */}
      <div className="flex items-center gap-3 mb-5">
        {isLoading ? (
          <div className="flex-1 bg-[#f5eded] border border-[#eddada] rounded-lg px-4 py-3 flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#731515]/30 border-t-[#731515] animate-spin" />
            <span className="text-[11px] tracking-[0.2em] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
              GENERAZIONE CODICE…
            </span>
          </div>
        ) : (
          <div
            className="flex-1 bg-white border border-[#eddada] rounded-lg px-4 py-3 text-center tracking-[0.18em] text-[#1a0505] font-medium"
            style={{ fontFamily: 'var(--font-syne)', fontSize: '17px' }}
          >
            {referralCode}
          </div>
        )}
        <button
          onClick={copyLink}
          title={t('referralCopyLink')}
          disabled={isLoading}
          className="shrink-0 w-11 h-11 flex items-center justify-center border border-[#eddada] bg-white rounded-lg text-[#7a4a4a] hover:text-[#731515] hover:border-[#731515] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                <Check size={15} className="text-emerald-600" />
              </motion.span>
            ) : (
              <motion.span key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                <Copy size={15} />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] tracking-[0.3em] text-[#7a4a4a]/70">{t('referralProgress')}</span>
          <span className="text-[11px] font-medium text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {uses}/{REWARD_THRESHOLD}
          </span>
        </div>
        <div className="h-1.5 bg-[#eddada] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#731515] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        {!rewardUnlocked && (
          <p className="mt-1.5 text-[11px] text-[#7a4a4a]/55" style={{ fontFamily: 'var(--font-nunito)' }}>
            {remaining > 0
              ? t('referralRemaining', { n: remaining })
              : t('referralAlmostThere')}
          </p>
        )}
      </div>

      {/* Reward unlocked banner */}
      <AnimatePresence>
        {rewardUnlocked && rewardCode && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 bg-[#731515] text-white rounded-xl px-5 py-4 flex items-start gap-3"
          >
            <Gift size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] tracking-[0.4em] opacity-70 mb-1">{t('referralRewardLabel')}</p>
              <p className="text-lg font-medium tracking-[0.12em]" style={{ fontFamily: 'var(--font-syne)' }}>
                {rewardCode}
              </p>
              <p className="text-xs opacity-70 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                {t('referralRewardDesc')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={shareWhatsApp}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#1fbe5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {/* WhatsApp icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          WHATSAPP
        </button>

        <button
          onClick={shareEmail}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#eddada] bg-white text-[#731515] text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#fdf6f6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          EMAIL
        </button>

        <button
          onClick={copyLink}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#eddada] bg-white text-[#7a4a4a] text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#fdf6f6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          {copied ? t('referralCopied') : t('referralCopyLink')}
        </button>
      </div>

      <p className="mt-3 text-[11px] text-[#7a4a4a]/45" style={{ fontFamily: 'var(--font-nunito)' }}>
        {t('referralNote')}
      </p>
    </motion.div>
  );
}
