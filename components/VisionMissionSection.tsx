'use client';

import { motion } from 'framer-motion';

export default function VisionMissionSection() {
  return (
    <section className="py-14 md:py-16 bg-[#fdf6f6]">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#731515]/10">

          {/* OUR VISION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#fdf6f6] p-10 md:p-12 flex flex-col gap-5"
          >
            <h3
              className="text-[clamp(1.8rem,3vw,2.6rem)] font-light text-[#1a0505] leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >Our Vision</h3>
            <div className="w-8 h-px bg-[#731515]/30" />
            <p
              className="text-lg font-normal text-[#7a4a4a] leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              A community where young wine lovers discover the world&apos;s finest estates, share great bottles and build lasting memories together.
            </p>
          </motion.div>

          {/* OUR MISSION */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-[#fdf6f6] p-10 md:p-12 flex flex-col gap-5"
          >
            <h3
              className="text-[clamp(1.8rem,3vw,2.6rem)] font-light text-[#1a0505] leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >Our Mission</h3>
            <div className="w-8 h-px bg-[#731515]/30" />
            <p
              className="text-lg font-normal text-[#7a4a4a] leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Vivo Wine Club was born from a simple passion: making fine wine accessible, social and exciting. We bring together the most curious wine lovers across Europe for exclusive cellar visits, curated tastings and unforgettable evenings.
            </p>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
