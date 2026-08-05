import type { Locale } from '@/i18n/request';

export interface LegalSection {
  /** Omit to continue the previous section's text (e.g. a closing paragraph after a bullet list) without a new numbered heading. */
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  subtitle?: string;
  intro?: string[];
  sections: LegalSection[];
  lastUpdated?: string;
}

export type LegalDocumentByLocale = Partial<Record<Locale, LegalDocument>>;

/** Falls back to English for any locale whose translation isn't ready yet. */
export function resolveLegalDocument(doc: LegalDocumentByLocale, locale: Locale): LegalDocument {
  return doc[locale] ?? doc.en!;
}
