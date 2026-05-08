import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import CartDrawer from '@/components/CartDrawer';

// Skeleton placeholder — matches section height to avoid layout shift
function SectionSkeleton({ height = 'h-[500px]' }: { height?: string }) {
  return <div className={`w-full ${height} bg-transparent`} aria-hidden="true" />;
}

// Every section below the fold is lazy-loaded in its own JS chunk.
// This keeps the initial bundle small and lets the hero paint immediately.
const MembershipSection = dynamic(() => import('@/components/MembershipSection'), {
  loading: () => <SectionSkeleton height="h-[680px]" />,
});
const StatsSection = dynamic(() => import('@/components/StatsSection'), {
  loading: () => <SectionSkeleton height="h-[220px]" />,
});
const VisionMissionSection = dynamic(() => import('@/components/VisionMissionSection'), {
  loading: () => <SectionSkeleton height="h-[260px]" />,
});
const ExperiencesSection = dynamic(() => import('@/components/ExperiencesSection'), {
  loading: () => <SectionSkeleton height="h-[680px]" />,
});
const EventsSection = dynamic(() => import('@/components/EventsSection'), {
  loading: () => <SectionSkeleton height="h-[600px]" />,
});
const LinkedInSection = dynamic(() => import('@/components/LinkedInSection'), {
  loading: () => <SectionSkeleton height="h-[500px]" />,
});
const PartnersSection = dynamic(() => import('@/components/PartnersSection'), {
  loading: () => <SectionSkeleton height="h-[240px]" />,
});
const Footer = dynamic(() => import('@/components/Footer'), {
  loading: () => <SectionSkeleton height="h-[400px]" />,
});

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <VisionMissionSection />
        <ExperiencesSection />
        <EventsSection />
        <LinkedInSection />
        <MembershipSection />
        <PartnersSection />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
