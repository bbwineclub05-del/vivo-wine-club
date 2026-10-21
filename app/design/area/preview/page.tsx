import { notFound } from 'next/navigation';
import TaskBoard from '@/components/TaskBoard';
import PedManager from '@/components/PedManager';
import { MockDocuments } from './MockDocuments';
import { MockFinance } from './MockFinance';
import QuoteGenerator from '@/components/QuoteGenerator';
import { MockCrm } from './MockCrm';

/**
 * Task and the editorial plan, mounted outside the login so the layout
 * can be checked at phone width without an account.
 *
 * Development only. These components render real task titles and real
 * content plans, which have no business being on a page anyone can
 * open, so in any other environment this route does not exist.
 */
export default function AreaPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <div className="ds min-h-[100dvh] bg-paper text-on-paper">
      <div className="mx-auto max-w-[1100px] px-4 py-10 lg:px-8">
        <p className="mb-8 rounded-2xl border border-dashed border-rule-paper px-4 py-3 text-fine text-on-paper-muted">
          Anteprima di sviluppo. Il menù dell&apos;area non è montato qui: si
          guardano solo le due sezioni.
        </p>

        <TaskBoard currentEmail="giacomogallo1310@gmail.com" />

        <hr className="my-16 border-rule-paper" />

        <PedManager />

        <hr className="my-16 border-rule-paper" />

        {/* Archivio finto: vedi MockDocuments. */}
        <MockDocuments />

        <hr className="my-16 border-rule-paper" />

        {/* Registro finto: vedi MockFinance. */}
        <MockFinance />

        <hr className="my-16 border-rule-paper" />

        {/* Il modulo preventivi non legge dati dal server. */}
        <QuoteGenerator />

        <hr className="my-16 border-rule-paper" />

        {/* Rubrica finta: vedi MockCrm. */}
        <MockCrm />
      </div>
    </div>
  );
}
