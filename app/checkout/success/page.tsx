import { SiteNav } from '@/components/ui/SiteNav';
import { SiteFooter } from '@/components/ui/SiteFooter';
import SuccessContent from './SuccessContent';

/**
 * Dopo il pagamento.
 *
 * Serve a dire tre cose: è andata, il biglietto è nella tua mail,
 * ecco quando e dove. Il resto è di troppo.
 */
export default function CheckoutSuccessPage() {
  return (
    <>
      <SiteNav />
      <main className="ds min-h-[70vh] bg-paper text-on-paper">
        <SuccessContent />
      </main>
      <SiteFooter />
    </>
  );
}
