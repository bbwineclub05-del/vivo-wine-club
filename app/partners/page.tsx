import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import PartnersContent from './PartnersContent';

/**
 * I partner.
 *
 * Guscio server, contenuto client: il piede del sito legge le
 * traduzioni dal server e non si puo' importare dentro un componente
 * client, mentre le schede hanno le linguette e quindi uno stato.
 * La pagina era rimasta senza piede proprio per questo.
 */
export default function PartnersPage() {
  return (
    <>
      <SiteNav />
      <PartnersContent />
      <SiteFooter />
    </>
  );
}
