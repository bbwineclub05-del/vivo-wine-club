import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import EventsSection from '@/components/EventsSection';
import WineriesSection from '@/components/WineriesSection';
import MerchandiseSection from '@/components/MerchandiseSection';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <EventsSection />
        <WineriesSection />
        <MerchandiseSection />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
