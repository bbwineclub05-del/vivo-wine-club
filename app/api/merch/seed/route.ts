import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

// ── POST /api/merch/seed ───────────────────────────────────────────────────────
// One-time migration: inserts all static merch products into the products table.
// Admin-only. Safe to call multiple times — skips products that already exist
// (matched by title).
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const PRODUCTS = [
    // ── Wear The Club (real product photos) ──────────────────────────────────
    { title: 'Classic Tee',       description: 'Soft 100% cotton tee with embroidered club crest.',             price: 35,  sizes: ['S','M','L','XL'], images: ['/merch/maglietta.png'],      sort_order: 1  },
    { title: 'Club Hoodie',       description: 'Heavyweight fleece with chest logo.',                           price: 65,  sizes: ['S','M','L','XL'], images: ['/merch/felpa.png'],           sort_order: 2  },
    { title: 'Club Cap',          description: 'Structured 6-panel cap with tonal logo.',                       price: 30,  sizes: [],                 images: ['/merch/cappellino.png'],     sort_order: 3  },
    { title: 'Tote Bag',          description: 'Heavy canvas tote — fits two bottles.',                         price: 25,  sizes: [],                 images: ['/merch/totebag.png'],        sort_order: 4  },
    { title: 'Wine Carrier',      description: 'Insulated carrier for up to 4 bottles.',                        price: 45,  sizes: [],                 images: ['/merch/portabicchiere.png'], sort_order: 5  },
    { title: 'Wine Glass',        description: 'Crystal-clear glass with engraved club logo.',                  price: 18,  sizes: [],                 images: ['/merch/bicchiere.png'],      sort_order: 6  },
    { title: 'Corkscrew',         description: "Professional-grade waiter's corkscrew.",                        price: 20,  sizes: [],                 images: ['/merch/cavatappi.png'],      sort_order: 7  },
    { title: 'IQOS Case',         description: 'Slim protective case with Vivo Wine Club branding.',            price: 22,  sizes: [],                 images: ['/merch/iqos.png'],           sort_order: 8  },
    // ── Boutique / Accessories ────────────────────────────────────────────────
    { title: 'Decanter Crystal Premium', description: 'Hand-blown crystal decanter, limited numbered edition.',                                       price: 120, sizes: [],                 images: [],                            sort_order: 9  },
    { title: 'Bordeaux Crystal Set',     description: 'Set of 4 Riedel crystal glasses, ideal for great Bordeaux wines.',                            price: 89,  sizes: [],                 images: [],                            sort_order: 10 },
    { title: 'Luxury Wine Journal',      description: 'Full-leather bound tasting diary, 365 acid-free pages.',                                       price: 55,  sizes: [],                 images: [],                            sort_order: 11 },
    { title: 'Sommelier Kit Pro',        description: 'Professional set: corkscrew, foil cutter, thermometer, aerator, goutte.',                      price: 75,  sizes: [],                 images: [],                            sort_order: 12 },
    { title: 'Tote Bag Premium',         description: 'Heavy canvas wine carrier, holds 6 bottles, gold embroidered logo.',                           price: 35,  sizes: [],                 images: [],                            sort_order: 13 },
    { title: 'Exclusive Gift Box',       description: 'Curated gift box: selected wine, glass, accessories and quarterly membership.',                 price: 185, sizes: [],                 images: [],                            sort_order: 14 },
    { title: 'T-Shirt Pima Cotton',      description: 'Unisex 100% Pima cotton t-shirt, gold thread embroidered logo.',                               price: 45,  sizes: ['S','M','L','XL'], images: [],                            sort_order: 15 },
    { title: 'Membership Gold',          description: 'Annual Gold membership with unlimited access to all club events.',                              price: 299, sizes: [],                 images: [],                            sort_order: 16 },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  // Fetch titles already in DB to skip duplicates
  const { data: existing } = await db.from('products').select('title');
  const existingTitles = new Set<string>((existing ?? []).map((r: { title: string }) => r.title));

  const toInsert = PRODUCTS
    .filter((p) => !existingTitles.has(p.title))
    .map((p) => ({ ...p, visible: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, message: 'All products already exist.' });
  }

  const { data, error } = await db.from('products').insert(toInsert).select('id, title');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: data.length, products: data });
}
