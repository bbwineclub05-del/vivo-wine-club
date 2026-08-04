'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  getStoredConsent,
  saveConsent,
  OPEN_PREFERENCES_EVENT,
} from '@/lib/cookieConsent';

function ToggleRow({
  label,
  desc,
  on,
  onChange,
  disabled,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] text-[#C4B5A0]">{label}</p>
        <p className="text-[11px] text-[#C4B5A0]/50 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!on)}
        className={`w-9 h-5 rounded-full shrink-0 flex items-center px-0.5 transition-colors duration-200 ${
          on ? 'bg-[#731515]' : 'bg-white/15'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.div
          className="w-4 h-4 rounded-full bg-white"
          animate={{ x: on ? 16 : 0 }}
          transition={{ duration: 0.15 }}
        />
      </button>
    </div>
  );
}

export default function CookieBanner() {
  const t = useTranslations('cookieBanner');
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    } else {
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    }

    // Triggered by the "Manage Cookies" link in the footer, at any time —
    // reopens the panel pre-filled with the currently stored choice.
    function handleOpenPreferences() {
      const current = getStoredConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setCustomizing(true);
      setVisible(true);
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, handleOpenPreferences);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, handleOpenPreferences);
  }, []);

  function acceptAll() {
    saveConsent({ analytics: true, marketing: true });
    setAnalytics(true);
    setMarketing(true);
    setVisible(false);
    setCustomizing(false);
  }

  function rejectNonEssential() {
    saveConsent({ analytics: false, marketing: false });
    setAnalytics(false);
    setMarketing(false);
    setVisible(false);
    setCustomizing(false);
  }

  function savePreferences() {
    saveConsent({ analytics, marketing });
    setVisible(false);
    setCustomizing(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-16 left-0 right-0 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 z-[185] w-full sm:w-auto sm:max-w-sm"
        >
          <div className="bg-[#1a0505] border-b border-[#731515]/30 sm:border sm:rounded-2xl px-6 sm:px-7 py-5 sm:py-6 flex flex-col gap-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] max-h-[80vh] overflow-y-auto">
            <div>
              <p
                className="text-[11px] tracking-[0.3em] text-[#731515] mb-3"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('title')}
              </p>
              <p
                className="text-[14px] text-[#C4B5A0] font-light leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('description')}
              </p>
              <Link
                href="/cookie-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[11px] text-[#731515] underline hover:text-[#9b2323] transition-colors"
              >
                {t('policyLink')}
              </Link>
            </div>

            {customizing && (
              <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
                <ToggleRow label={t('technicalTitle')} desc={t('technicalDesc')} on disabled />
                <ToggleRow label={t('analyticsTitle')} desc={t('analyticsDesc')} on={analytics} onChange={setAnalytics} />
                <ToggleRow label={t('marketingTitle')} desc={t('marketingDesc')} on={marketing} onChange={setMarketing} />
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {!customizing ? (
                <>
                  <button
                    onClick={acceptAll}
                    className="w-full py-3 bg-[#731515] hover:bg-[#9b2323] text-[#F5EEE6] text-[11px] tracking-[0.28em] transition-colors duration-200 rounded-lg"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {t('acceptAll')}
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={rejectNonEssential}
                      className="flex-1 py-3 border border-white/15 hover:border-white/30 text-[#C4B5A0]/60 hover:text-[#C4B5A0] text-[10px] tracking-[0.2em] transition-all duration-200 rounded-lg"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {t('rejectNonEssential')}
                    </button>
                    <button
                      onClick={() => setCustomizing(true)}
                      className="flex-1 py-3 border border-white/15 hover:border-white/30 text-[#C4B5A0]/60 hover:text-[#C4B5A0] text-[10px] tracking-[0.2em] transition-all duration-200 rounded-lg"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {t('customize')}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={savePreferences}
                  className="w-full py-3 bg-[#731515] hover:bg-[#9b2323] text-[#F5EEE6] text-[11px] tracking-[0.28em] transition-colors duration-200 rounded-lg"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {t('save')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
