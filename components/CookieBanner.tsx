'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'vivo_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 z-[300] w-full sm:w-auto sm:max-w-sm"
        >
          <div className="bg-[#1a0505] border border-[#731515]/30 rounded-none sm:rounded-2xl px-6 sm:px-7 py-5 sm:py-6 flex flex-col gap-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
            <div>
              <p
                className="text-[11px] tracking-[0.3em] text-[#731515] mb-3"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                COOKIES
              </p>
              <p
                className="text-[15px] text-[#C4B5A0] font-light leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                We use cookies to improve your experience on our site.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={accept}
                className="flex-1 py-3 bg-[#731515] hover:bg-[#9b2323] text-[#F5EEE6] text-[11px] tracking-[0.28em] transition-colors duration-200 rounded-md"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                ACCEPT
              </button>
              <button
                onClick={decline}
                className="flex-1 py-3 border border-white/15 hover:border-white/30 text-[#C4B5A0]/60 hover:text-[#C4B5A0] text-[11px] tracking-[0.28em] transition-all duration-200 rounded-md"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                DECLINE
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
