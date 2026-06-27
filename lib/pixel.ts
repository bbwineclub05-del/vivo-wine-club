/**
 * Meta Pixel (fbq) wrapper — TypeScript-safe.
 * All calls are no-ops on the server or when the script hasn't loaded yet.
 */

export const PIXEL_ID = '889556867506381';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq?: (...args: any[]) => void;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fbq(...args: any[]): void {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

/* ── Standard events ── */

export const pixel = {
  /** Fire on any significant page view (automatic via layout, but can be re-fired) */
  pageView() {
    fbq('track', 'PageView');
  },

  /** Product list or group page */
  viewContentGroup(opts?: { content_name?: string }) {
    fbq('track', 'ViewContent', {
      content_type: 'product_group',
      ...opts,
    });
  },

  /** Single product page */
  viewProduct(opts: { content_name: string; value: number; currency?: string }) {
    fbq('track', 'ViewContent', {
      content_type: 'product',
      currency:     'EUR',
      ...opts,
    });
  },

  /** Event/experience page */
  viewEvent(opts: { content_name: string }) {
    fbq('track', 'ViewContent', {
      content_type: 'event',
      ...opts,
    });
  },

  /** Item added to cart */
  addToCart(opts: { content_name: string; value: number; currency?: string }) {
    fbq('track', 'AddToCart', {
      currency: 'EUR',
      ...opts,
    });
  },

  /** Checkout initiated (Stripe redirect) */
  initiateCheckout(opts: { value: number; currency?: string; content_name?: string }) {
    fbq('track', 'InitiateCheckout', {
      currency: 'EUR',
      ...opts,
    });
  },

  /** Free event sign-up / lead */
  lead(opts: { content_name: string }) {
    fbq('track', 'Lead', opts);
  },

  /** Completed purchase */
  purchase(opts: { value?: number; currency?: string; content_name?: string }) {
    fbq('track', 'Purchase', {
      currency: 'EUR',
      ...opts,
    });
  },
};
