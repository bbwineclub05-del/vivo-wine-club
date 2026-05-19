import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { NewsCard, type NewsItem } from '@/components/LinkedInSection';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function getNews(): Promise<NewsItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db
    .from('news')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as NewsItem[];
}

export default async function NewsPage() {
  const news = await getNews();

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#faf7f7] pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">

          {/* Header */}
          <div className="mb-10">
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">LATEST NEWS</div>
            <h1
              className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Our Latest News
            </h1>
            <p
              className="mt-6 text-lg text-[#7a4a4a] font-light italic max-w-xl"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Behind-the-scenes stories, winery visits and exclusive moments, shared with our community on LinkedIn.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-10" />

          {/* Cards */}
          {news.length === 0 ? (
            <p className="text-sm italic text-[#7a4a4a]/40" style={{ fontFamily: 'var(--font-nunito)' }}>
              No news published yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {news.map((item, i) => (
                <NewsCard key={item.id} post={item} index={i} reducedMotion={false} />
              ))}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
