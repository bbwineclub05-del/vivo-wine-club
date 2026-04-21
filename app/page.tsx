import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import StatsSection from '@/components/StatsSection';
import ExperiencesSection from '@/components/ExperiencesSection';
import EventsSection from '@/components/EventsSection';
import WineriesSection from '@/components/WineriesSection';
import WhoWeAreSection from '@/components/WhoWeAreSection';
import WearTheClubSection from '@/components/WearTheClubSection';
import CollaborateSection from '@/components/CollaborateSection';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';

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
        <WhoWeAreSection />
        <WearTheClubSection />
        <CollaborateSection />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
