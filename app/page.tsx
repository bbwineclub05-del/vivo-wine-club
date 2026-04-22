import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import EventsSection from '@/components/EventsSection';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

// Skeleton placeholder — matches section height to avoid layout shift
function SectionSkeleton({ height = 'h-[500px]' }: { height?: string }) {
  return <div className={`w-full ${height} bg-transparent`} aria-hidden="true" />;
}

// Heavy sections — lazy-loaded in separate JS chunks
const ExperiencesSection = dynamic(() => import('@/components/ExperiencesSection'), {
  loading: () => <SectionSkeleton height="h-[680px]" />,
});
const WineriesSection = dynamic(() => import('@/components/WineriesSection'), {
  loading: () => <SectionSkeleton height="h-[900px]" />,
});
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ExperiencesSection />
        <EventsSection />
        <WineriesSection />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
