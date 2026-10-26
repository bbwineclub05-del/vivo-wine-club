import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteNav } from '@/components/ui/SiteNav';
import WineriesContent from './WineriesContent';

/**
 * L'elenco delle cantine.
 *
 * Guscio server attorno a un contenuto client: il piede del sito
 * legge le traduzioni dal server e non puo' stare dentro un
 * componente client, ed e' il motivo per cui questa pagina ne era
 * rimasta senza.
 */
export default function WineriesPage() {
  return (
    <>
      <SiteNav />
      <WineriesContent />
      <SiteFooter />
    </>
  );
}
